# 부모 이미지 지정
FROM node:alpine
# app 디렉토리 생성

# ARG로 빌드 시점 변수를 선언
ARG DATABASE_URL
ARG PORT
ARG DATABASE_HOST
ARG DATABASE_PORT
ARG DATABASE_NAME
ARG DATABASE_USERNAME
ARG DATABASE_PASSWORD
ARG JWT_SECRET
# ENV로 런타임 환경 변수를 설정
ENV DATABASE_URL=$DATABASE_URL \
    PORT=$PORT \
    DATABASE_HOST=$DATABASE_HOST \
    DATABASE_PORT=$DATABASE_PORT \
    DATABASE_NAME=$DATABASE_NAME \
    DATABASE_USERNAME=$DATABASE_USERNAME \
    DATABASE_PASSWORD=$DATABASE_PASSWORD \
    JWT_SECRET=$JWT_SECRET

LABEL creator="no6@trello"
LABEL version="1.0.0"



#Docker 이미지 내부에서 RUN, CMD, ENTRYPOINT의 명령이 실행될 디렉터리를 설정합니다.

WORKDIR /app

# 외부 패키지 설치를 위해 package.json과 yarn.lock 파일 복사
COPY package.json .
COPY yarn.lock .

# 패키지 설치
RUN  yarn install

# 나머지 모두 복사
COPY . .
# 현재 디렉터리에 있는 파일들을 이미지 내부 /app 디렉터리에 추가함

ADD     . /app
RUN yarn prisma generate
# 하기 포트를 외부로 노출합니다.


CMD [ "yarn","dev" ]