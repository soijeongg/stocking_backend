import csv
import random

# CSV 파일을 생성하고 데이터를 작성하는 함수를 정의합니다.
# 시장가


def create_order_csv(filename, num_rows):
    # CSV 파일을 쓰기 모드로 엽니다.
    with open(filename, mode='w', newline='') as file:
        writer = csv.writer(file)

        # CSV 파일의 헤더를 작성합니다.
        writer.writerow(["companyId", "type", "price",  "quantity"])

        # 지정된 행 수만큼 루프를 돌면서 데이터를 작성합니다.
        for _ in range(num_rows):
            # 회사 ID, 주문 타입, 가격, 수량을 무작위로 생성합니다.
            companyId = random.randint(1638, 1640)
            type = random.choice(["buy", "sell"])
            quantity = random.randint(1, 3)

            # 생성된 데이터를 CSV 파일에 작성합니다.
            writer.writerow([companyId, type, "", quantity])


# 함수를 호출하여 'orders.csv' 파일에 100개의 주문 데이터를 생성합니다.
create_order_csv("orders.csv", 1000)
