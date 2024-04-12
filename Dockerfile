#부모 이미지 지정
FROM node:alpine
#도커 내부의 디렉토리를 생성
WORKDIR /app

# 외부 패키지 설치를 위해 package.json과 yarn.lock 파일 복사
COPY main/package.json .
COPY main/yarn.lock .

# 패키지 설치
RUN  yarn install

# 메인 폴더의 내용을 전부 복사 
COPY main .
# 현재 디렉터리에 있는 파일들을 이미지 내부 /app 디렉터리에 추가함

ADD     . /app
#로컬 빌드이기때문에 안의 .env파일이 있어 arg와 env로 사용할 필요 없음

RUN yarn prisma generate

CMD [ "node","src/app.js" ]