import dotenv from 'dotenv';
import axios from 'axios';
import { prisma } from '../prisma/index.js';
import { rate } from '../companyInfo/index.js';
dotenv.config();

const codeToName = {
  '000120': 'CJ대한통운',
  '003620': 'KG모빌리티',
  373220: 'LG에너지솔루션',
  '035420': 'NAVER',
  302440: 'SK바이오사이언스',
  '000660': 'SK하이닉스',
  '001570': '금양',
  '000270': '기아',
  '003490': '대한항공',
  '028050': '삼성엔지니어링',
  '005930': '삼성전자',
  '041510': '에스엠',
  '086520': '에코프로',
  455900: '엔젤로보틱스',
  '035720': '카카오',
  259960: '크래프톤',
  352820: '하이브',
  128940: '한미약품',
  '012330': '현대모비스',
  '004020': '현대제철',
};

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

async function updateFluctuationRate() {
  const companyList = await prisma.company.findMany();
  for (comopany of companyList) {
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
      await prisma.company.update({
        where: {
          name: company.name,
        },
        data: {
          fluctuationRate: response.data.output.prdy_ctrt,
        },
      });
    } catch (err) {
      console.error(`Error fetching price for stock code ${code}:`, err.message);
    }
  }
}
