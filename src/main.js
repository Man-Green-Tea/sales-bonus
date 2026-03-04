/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  //Расчет выручки от операции
  const discount = 1 - purchase.discount / 100;
  const revenue = purchase.sales_price * purchase.quantity * discount;
  return +revenue.toFixed(2);
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */

function calculateBonusByProfit(index, total, seller) {
  //Расчет бонуса от позиции в рейтинге
  const bonusPercentage = () => {
    switch (index) {
      case 0:
        return 0.15;

      case total - 1:
        return 0;

      case 1:
      case 2:
        return 0.1;

      default:
        return 0.05;
    }
  };

  const bonus = bonusPercentage * seller.profit;
  return +bonus.toFixed(2);
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  //Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  //Проверка наличия опций
  const { calculateRevenue, calculateBonus } = options;
  if (
    !calculateRevenue ||
    !calculateBonus ||
    !typeof calculateRevenue === "function" ||
    !typeof calculateBonus === "function"
  ) {
    throw new Error("Функция не определена");
  }

  //Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  //Индексация продавцов и товаров для быстрого доступа
  function indexArrBy(rawArr, key) {
    return rawArr.reduce((acc, item) => {
      if (item[key]) {
        return { ...acc, [item[key]]: item };
      }
      return acc;
    }, {});
  }
  const sellerIndex = indexArrBy(sellerStats, "id");
  const productIndex = indexArrBy(data.products, "sku");

  //Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    seller.sales_count += 1;
    seller.revenue += record.total_amount;

    record.items.forEach((item) => {
      const product = productIndex[item.sku];

      const cost = product.purchase_price * item.quantity;

      const revenue = calculateRevenue(item, product);

      const profit = revenue - cost;

      seller.profit += profit;

      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] += item.quantity;
      }
    });
  });

  //Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => (b.profit = a.profit));

  //Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    //топ 10 продуктов
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({
        sku: sku,
        quantity: quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  //Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: seller.revenue,
    profit: seller.profit,
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: seller.bonus,
  }));
}
