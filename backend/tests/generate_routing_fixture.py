"""Generate a synthetic test xlsx fixture with Bay Area addresses for routing testing."""

from openpyxl import Workbook


def generate():
    wb = Workbook()
    ws = wb.active

    # Rows 1-3: WeChat metadata (skipped via skiprows=3)
    ws.append(["WeChat Order Export"])
    ws.append(["Generated: 2024-06-15"])
    ws.append([""])

    # Row 4: Column headers
    ws.append(["序号", "姓名", "内容", "标签", "手机号码", "收货地址", "所在城市", "邮政编码"])

    # Row 5+: Order records with real Bay Area addresses (SF → Fremont → San Jose corridor)
    orders = [
        [
            1,
            "张三",
            "肉末香茹胡罗卜糯米烧卖 15个/份x3， 荠菜鲜肉馄饨 50/份x2， 总价：$100.00",
            "",
            4151110001,
            "3288 Pierce St",
            "San Francisco",
            94123,
        ],
        [
            2,
            "李四",
            "肉包子 10个/份x1， 花卷馒头 10个/份x2， 肉末香茹胡罗卜糯米烧卖 15个/份x1， 总价：$80.00",
            "",
            4151110002,
            "2999 Mission St",
            "San Francisco",
            94110,
        ],
        [
            3,
            "王五",
            "荠菜鲜肉馄饨 50/份x1， 素鸭 每份x2， 总价：$50.00",
            "",
            6501110003,
            "1300 El Camino Real",
            "Millbrae",
            94030,
        ],
        [
            4,
            "赵六",
            "糖醋小排 每份x3， 红烧猪蹄 每份x1， 总价：$120.00",
            "",
            4081110004,
            "10123 N Wolfe Rd",
            "Cupertino",
            95014,
        ],
        [
            5,
            "陈七",
            "肉末香茹胡罗卜糯米烧卖 15个/份x2， 糖醋小排 每份x1， 总价：$70.00",
            "",
            5101110005,
            "39159 Paseo Padre Pkwy",
            "Fremont",
            94538,
        ],
        [
            6,
            "刘八",
            "花卷馒头 10个/份x3， 荠菜鲜肉馄饨 50/份x1， 总价：$60.00",
            "",
            4081110006,
            "2025 Gateway Pl",
            "San Jose",
            95110,
        ],
    ]
    for order in orders:
        ws.append(order)

    # Blank row
    ws.append([])

    # 商品汇总 summary table
    ws.append(["商品", None, "数量"])
    ws.append(["肉末香茹胡罗卜糯米烧卖15个/份", None, 6])
    ws.append(["荠菜鲜肉馄饨50/份", None, 4])
    ws.append(["肉包子10个/份", None, 1])
    ws.append(["花卷馒头10个/份", None, 5])
    ws.append(["素鸭每份", None, 2])
    ws.append(["糖醋小排每份", None, 4])
    ws.append(["红烧猪蹄每份", None, 1])
    ws.append(["总计", None, 23])

    wb.save("tests/fixtures/sample_routing_export.xlsx")
    print("Generated tests/fixtures/sample_routing_export.xlsx")


if __name__ == "__main__":
    generate()
