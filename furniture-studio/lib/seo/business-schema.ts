/**
 * JSON-LD (schema.org) для главной страницы и всего сайта — карточка
 * компании в Google/Яндекс (локальный пак, сниппет, панель знаний).
 *
 * Реальные бизнес-факты (город, товары, материалы, услуги, телефоны) на
 * момент написания ЗАФИКСИРОВАНЫ ЗДЕСЬ КАК КОНСТАНТЫ, а не тянутся из
 * site_settings — потому что admin-панель хранит только name/phone/address/
 * SEO-заголовки (см. lib/validations/settings.schema.ts), а не каталог
 * товаров/материалов/услуг. Название компании и телефон ниже задублированы
 * с тем, что стоит (или будет стоять) в /admin/settings — при смене
 * названия/телефона в админке поправить и здесь, синхронизации нет.
 *
 * Официального адреса и логотипа пока нет (см. переписку с заказчиком) —
 * оба поля ниже либо опущены, либо помечены TODO. Точный список районов
 * обслуживания заказчик не назвал — сейчас указаны город и область целиком
 * (areaServed), без выдуманных названий конкретных районов.
 */

const BUSINESS_NAME = 'Брянская мебельная компания';
const BUSINESS_SHORT_NAME = 'БМК';

const PHONES = ['+79102394011', '+79003617185'] as const;

function formatPhoneDisplay(phone: string): string {
  // +79102394011 -> +7 910 239-40-11
  const digits = phone.replace(/\D/g, '');
  return `+${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
}

export function buildBusinessSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    name: BUSINESS_NAME,
    alternateName: BUSINESS_SHORT_NAME,
    url: siteUrl,
    // TODO: заменить на реальный путь к логотипу, когда он появится
    // (положить файл в /public или Storage и подставить siteAssetUrl(...)).
    // logo: `${siteUrl}/logo.png`,
    description:
      'Изготовление мягкой мебели на заказ в Брянске и Брянской области: ' +
      'диваны прямые, модульные и угловые, кровати, кресла, кресла-кровати. ' +
      'Любые размеры, формы и цвета.',
    slogan: 'Качество, доступные цены, короткие сроки изготовления',

    // Заказчик пока не даёт публичный адрес — по рекомендациям Google для
    // бизнеса без витрины/шоурума не публикуют streetAddress, а указывают
    // только зону обслуживания (areaServed) и город без точного адреса.
    // Если появится офис/шоурум — добавить address.streetAddress и geo.
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Брянск',
      addressRegion: 'Брянская область',
      addressCountry: 'RU',
    },
    areaServed: [
      { '@type': 'City', name: 'Брянск' },
      { '@type': 'AdministrativeArea', name: 'Брянская область' },
    ],

    telephone: formatPhoneDisplay(PHONES[0]),
    contactPoint: PHONES.map((phone) => ({
      '@type': 'ContactPoint',
      telephone: phone,
      contactType: 'sales',
      areaServed: 'RU',
      availableLanguage: 'Russian',
    })),

    priceRange: '₽₽',
    paymentAccepted: 'Наличные при получении заказа',
    currenciesAccepted: 'RUB',

    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Материалы',
        value: 'ДСП, ДВП, фанера, ППУ, БНП (блок независимых пружин), обивочные ткани разных категорий',
      },
      {
        '@type': 'PropertyValue',
        name: 'Индивидуальное изготовление',
        value: 'Любые размеры, формы и цвета по согласованию с клиентом',
      },
    ],

    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Мебель на заказ и услуги',
      itemListElement: [
        {
          '@type': 'OfferCatalog',
          name: 'Мебель на заказ',
          itemListElement: [
            'Диван прямой',
            'Диван модульный',
            'Диван угловой',
            'Кровать',
            'Кресло',
            'Кресло-кровать',
          ].map((productName) => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Product', name: productName },
          })),
        },
        {
          '@type': 'OfferCatalog',
          name: 'Услуги',
          itemListElement: ['Доставка', 'Подъём на этаж', 'Сборка', 'Замер'].map((serviceName) => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: serviceName },
          })),
        },
      ],
    },
  };
}
