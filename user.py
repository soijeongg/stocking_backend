# 필요한 라이브러리를 임포트합니다.
import csv
import random
import string

# CSV 파일을 생성하고 데이터를 작성하는 함수를 정의합니다.


def create_csv_file(filename, num_rows):
    # CSV 파일을 쓰기 모드로 엽니다.
    with open(filename, mode='w', newline='') as file:
        writer = csv.writer(file)

        # CSV 파일의 헤더를 작성합니다.
        writer.writerow(["email", "password", "nickname"])

        # 지정된 행 수만큼 루프를 돌면서 데이터를 작성합니다.
        for _ in range(num_rows):
            # 이메일, 비밀번호, 닉네임을 무작위로 생성합니다.
            email = ''.join(random.choices(
                string.ascii_lowercase + string.digits, k=10)) + "@example.com"
            password = ''.join(random.choices(
                string.ascii_letters + string.digits, k=10))
            nickname = ''.join(random.choices(string.ascii_lowercase, k=10))

            # 생성된 데이터를 CSV 파일에 작성합니다.
            writer.writerow([email, password, nickname])


# 함수를 호출하여 'users.csv' 파일에 100개의 무작위 사용자 데이터를 생성합니다.
create_csv_file("users.csv", 1000)
