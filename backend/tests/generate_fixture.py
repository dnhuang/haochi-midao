"""Generate a synthetic test xlsx fixture matching WeChat export format."""

from openpyxl import Workbook


def generate():
    wb = Workbook()
    ws = wb.active

    # Rows 1-3: WeChat metadata (skipped via skiprows=3)
    ws.append(["WeChat Order Export"])
    ws.append(["Generated: 2024-01-01"])
    ws.append([""])

    # Row 4: Column headers
    # 序号, 姓名, 内容, 标签, 手机号码, 收货地址, 所在城市, 邮政编码
    ws.append(["序号", "姓名", "内容", "标签", "手机号码", "收货地址", "所在城市", "邮政编码"])

    # Row 5-8: Order records
    # Note: items are separated by '， ' (Chinese comma + space), last segment is total price
    orders = [
        [
            1,
            "张三",
            "肉末香茹胡罗卜糯米烧卖 15个/份x3， 荠菜鲜肉馄饨 50/份x2， 总价：$100.00",
            "",
            13800001111,
            "123 Main St",
            "New York",
            10001,
        ],
        [
            2,
            "李四",
            "肉包子 10个/份x1， 花卷馒头 10个/份x2， 肉末香茹胡罗卜糯米烧卖 15个/份x1， 总价：$80.00",
            "",
            13800002222,
            "456 Oak Ave",
            "Boston",
            20001,
        ],
        [
            3,
            "王五",
            "荠菜鲜肉馄饨 50/份x1， 素鸭 每份x2， 总价：$50.00",
            "",
            13800003333,
            "789 Pine Rd",
            "Chicago",
            30001,
        ],
        [
            4,
            "赵六",
            "糖醋小排 每份x3， 红烧猪蹄 每份x1， 总价：$120.00",
            "",
            13800004444,
            "321 Elm St",
            "Seattle",
            40001,
        ],
    ]
    for order in orders:
        ws.append(order)

    # Blank row
    ws.append([])

    # 商品汇总 summary table
    ws.append(["商品", None, "数量"])
    ws.append(["肉末香茹胡罗卜糯米烧卖15个/份", None, 4])
    ws.append(["荠菜鲜肉馄饨50/份", None, 3])
    ws.append(["肉包子10个/份", None, 1])
    ws.append(["花卷馒头10个/份", None, 2])
    ws.append(["素鸭每份", None, 2])
    ws.append(["糖醋小排每份", None, 3])
    ws.append(["红烧猪蹄每份", None, 1])
    ws.append(["总计", None, 16])

    wb.save("tests/fixtures/sample_export.xlsx")
    print("Generated tests/fixtures/sample_export.xlsx")


if __name__ == "__main__":
    generate()
