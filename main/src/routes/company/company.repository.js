import axios from 'axios';
const nameToCode = {
  CJ대한통운: '000120',
  KG모빌리티: '003620',
  LG에너지솔루션: 373220,
  NAVER: '035420',
  SK바이오사이언스: 302440,
  SK하이닉스: '000660',
  금양: '001570',
  기아: '000270',
  대한항공: '003490',
  삼성엔지니어링: '028050',
  삼성전자: '005930',
  에스엠: '041510',
  에코프로: '086520',
  엔젤로보틱스: 455900,
  카카오: '035720',
  크래프톤: 259960,
  하이브: 352820,
  한미약품: 128940,
  현대모비스: '012330',
  현대제철: '004020',
};

export class CompanyRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }
  updateFluctuationRate = async () => {
    const companyList = await this.prisma.company.findMany();
    for (let company of companyList) {
      try {
        const response = await axios.get('https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-price', {
          headers: {
            authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
            appkey: process.env.appKey,
            appsecret: process.env.secretKey,
            tr_id: 'FHKST01010100',
          },
          params: {
            fid_cond_mrkt_div_code: 'J',
            fid_input_iscd: `${nameToCode[company.name]}`,
          },
        });
        await this.prisma.company.update({
          where: {
            name: company.name,
          },
          data: {
            fluctuationRate: parseFloat(response.data.output.prdy_ctrt),
          },
        });
      } catch (err) {
        console.error(`Error fetching price for stock code `, err.message);
      }
    }
  };
  getCompanies = async () => {
    const companies = await this.prisma.company.findMany();
    return companies;
  };
  getFollowCompanies = async (userId) => {
    const followCompanies = await this.prisma.Follow.findMany({
      where: {
        userId: +userId,
      },
    });
    const followList = await Promise.all(
      followCompanies.map(async (follow) => {
        const company = await this.prisma.company.findUnique({
          where: {
            companyId: +follow.companyId,
          },
        });
        return company;
      })
    );

    return followList;
  };
}
