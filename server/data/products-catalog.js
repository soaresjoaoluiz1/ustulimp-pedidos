/**
 * Catálogo Ustulimp — tabelas de out/2026 (as duas tabelas oficiais impressas).
 * 30 SKUs. Venda POR CAIXA.
 *
 *   prices["revenda"]          = preço da CAIXA pro revendedor (pedido mínimo R$ 1.500)
 *   prices["consumidor-final"] = preço da CAIXA pro cliente final (sem pedido mínimo)
 *   null = produto não é vendido naquela tabela (não aparece pro cliente dela)
 *   suggested_sale_price       = revenda sugerida POR UNIDADE, com 60% de lucro
 *   units_per_box              = unidades na caixa (6 un. de 2L ou 4 un. de 5L)
 *   peso_kg = estimativa (litros × 1,05) pro resumo de transporte
 */

export const PRODUCTS = [
  {
    "sku": "001",
    "name": "Água Sanitária 2L",
    "category": "Água Sanitária e Alvejante",
    "units_per_box": 6,
    "prices": {
      "revenda": 24.0,
      "consumidor-final": 33.6
    },
    "suggested_sale_price": 6.4,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": "/pedidos/products/001.webp",
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "002",
    "name": "Água Sanitária 5L",
    "category": "Água Sanitária e Alvejante",
    "units_per_box": 4,
    "prices": {
      "revenda": 32.0,
      "consumidor-final": 39.6
    },
    "suggested_sale_price": 12.8,
    "short_use": "Caixa com 4 un. de 5L",
    "tags": [
      "5L",
      "Cx 4 un."
    ],
    "image_url": "/pedidos/products/002.webp",
    "peso_kg": 21.0,
    "volume_m3": 0
  },
  {
    "sku": "003",
    "name": "Alvejante sem Cloro 2L",
    "category": "Água Sanitária e Alvejante",
    "units_per_box": 6,
    "prices": {
      "revenda": 41.4,
      "consumidor-final": 69.6
    },
    "suggested_sale_price": 11.04,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": null,
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "004",
    "name": "Amaciante Azul 2L",
    "category": "Amaciantes",
    "units_per_box": 6,
    "prices": {
      "revenda": 32.4,
      "consumidor-final": 53.4
    },
    "suggested_sale_price": 8.64,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": "/pedidos/products/004.webp",
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "005",
    "name": "Amaciante Azul 5L",
    "category": "Amaciantes",
    "units_per_box": 4,
    "prices": {
      "revenda": 49.6,
      "consumidor-final": 71.6
    },
    "suggested_sale_price": 19.84,
    "short_use": "Caixa com 4 un. de 5L",
    "tags": [
      "5L",
      "Cx 4 un."
    ],
    "image_url": null,
    "peso_kg": 21.0,
    "volume_m3": 0
  },
  {
    "sku": "006",
    "name": "Amaciante Chá Branco 5L",
    "category": "Amaciantes",
    "units_per_box": 4,
    "prices": {
      "revenda": 55.6,
      "consumidor-final": 75.6
    },
    "suggested_sale_price": 22.24,
    "short_use": "Caixa com 4 un. de 5L",
    "tags": [
      "5L",
      "Cx 4 un."
    ],
    "image_url": null,
    "peso_kg": 21.0,
    "volume_m3": 0
  },
  {
    "sku": "007",
    "name": "Desinfetante Algas Marinhas 2L",
    "category": "Desinfetantes",
    "units_per_box": 6,
    "prices": {
      "revenda": 23.4,
      "consumidor-final": 35.4
    },
    "suggested_sale_price": 6.24,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": null,
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "008",
    "name": "Desinfetante Lavanda 2L",
    "category": "Desinfetantes",
    "units_per_box": 6,
    "prices": {
      "revenda": 23.4,
      "consumidor-final": 35.4
    },
    "suggested_sale_price": 6.24,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": null,
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "009",
    "name": "Desinfetante Brisa Algodão 2L",
    "category": "Desinfetantes",
    "units_per_box": 6,
    "prices": {
      "revenda": 23.4,
      "consumidor-final": 35.4
    },
    "suggested_sale_price": 6.24,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": "/pedidos/products/009.webp",
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "010",
    "name": "Desinfetante Flor de Cerejeira 2L",
    "category": "Desinfetantes",
    "units_per_box": 6,
    "prices": {
      "revenda": 23.4,
      "consumidor-final": 35.4
    },
    "suggested_sale_price": 6.24,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": null,
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "011",
    "name": "Desinfetante Pinho 2L",
    "category": "Desinfetantes",
    "units_per_box": 6,
    "prices": {
      "revenda": 23.4,
      "consumidor-final": 35.4
    },
    "suggested_sale_price": 6.24,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": "/pedidos/products/011.webp",
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "012",
    "name": "Desinfetante Algas Marinhas 5L",
    "category": "Desinfetantes",
    "units_per_box": 4,
    "prices": {
      "revenda": 33.6,
      "consumidor-final": 47.6
    },
    "suggested_sale_price": 13.44,
    "short_use": "Caixa com 4 un. de 5L",
    "tags": [
      "5L",
      "Cx 4 un."
    ],
    "image_url": "/pedidos/products/012.webp",
    "peso_kg": 21.0,
    "volume_m3": 0
  },
  {
    "sku": "013",
    "name": "Desinfetante Lavanda 5L",
    "category": "Desinfetantes",
    "units_per_box": 4,
    "prices": {
      "revenda": 33.6,
      "consumidor-final": 47.6
    },
    "suggested_sale_price": 13.44,
    "short_use": "Caixa com 4 un. de 5L",
    "tags": [
      "5L",
      "Cx 4 un."
    ],
    "image_url": "/pedidos/products/013.webp",
    "peso_kg": 21.0,
    "volume_m3": 0
  },
  {
    "sku": "014",
    "name": "Desinfetante Brisa Algodão 5L",
    "category": "Desinfetantes",
    "units_per_box": 4,
    "prices": {
      "revenda": 33.6,
      "consumidor-final": 47.6
    },
    "suggested_sale_price": 13.44,
    "short_use": "Caixa com 4 un. de 5L",
    "tags": [
      "5L",
      "Cx 4 un."
    ],
    "image_url": "/pedidos/products/014.webp",
    "peso_kg": 21.0,
    "volume_m3": 0
  },
  {
    "sku": "015",
    "name": "Desinfetante Flor de Cerejeira 5L",
    "category": "Desinfetantes",
    "units_per_box": 4,
    "prices": {
      "revenda": 33.6,
      "consumidor-final": 47.6
    },
    "suggested_sale_price": 13.44,
    "short_use": "Caixa com 4 un. de 5L",
    "tags": [
      "5L",
      "Cx 4 un."
    ],
    "image_url": "/pedidos/products/015.webp",
    "peso_kg": 21.0,
    "volume_m3": 0
  },
  {
    "sku": "016",
    "name": "Desinfetante Pinho 5L",
    "category": "Desinfetantes",
    "units_per_box": 4,
    "prices": {
      "revenda": 33.6,
      "consumidor-final": 47.6
    },
    "suggested_sale_price": 13.44,
    "short_use": "Caixa com 4 un. de 5L",
    "tags": [
      "5L",
      "Cx 4 un."
    ],
    "image_url": "/pedidos/products/016.webp",
    "peso_kg": 21.0,
    "volume_m3": 0
  },
  {
    "sku": "017",
    "name": "Detergente Neutro 2L",
    "category": "Detergentes",
    "units_per_box": 6,
    "prices": {
      "revenda": 34.2,
      "consumidor-final": 41.7
    },
    "suggested_sale_price": 9.12,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": "/pedidos/products/017.webp",
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "018",
    "name": "Detergente Neutro 5L",
    "category": "Detergentes",
    "units_per_box": 4,
    "prices": {
      "revenda": 51.6,
      "consumidor-final": 63.6
    },
    "suggested_sale_price": 20.64,
    "short_use": "Caixa com 4 un. de 5L",
    "tags": [
      "5L",
      "Cx 4 un."
    ],
    "image_url": "/pedidos/products/018.webp",
    "peso_kg": 21.0,
    "volume_m3": 0
  },
  {
    "sku": "019",
    "name": "Lava Roupas 2L",
    "category": "Lava Roupas",
    "units_per_box": 6,
    "prices": {
      "revenda": 50.4,
      "consumidor-final": 83.4
    },
    "suggested_sale_price": 13.44,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": "/pedidos/products/019.webp",
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "020",
    "name": "Lava Roupas 5L",
    "category": "Lava Roupas",
    "units_per_box": 4,
    "prices": {
      "revenda": 83.6,
      "consumidor-final": 107.6
    },
    "suggested_sale_price": 33.44,
    "short_use": "Caixa com 4 un. de 5L",
    "tags": [
      "5L",
      "Cx 4 un."
    ],
    "image_url": "/pedidos/products/020.webp",
    "peso_kg": 21.0,
    "volume_m3": 0
  },
  {
    "sku": "021",
    "name": "Lava Roupas Orquídea Negra 5L",
    "category": "Lava Roupas",
    "units_per_box": 4,
    "prices": {
      "revenda": 87.6,
      "consumidor-final": 111.6
    },
    "suggested_sale_price": 35.04,
    "short_use": "Caixa com 4 un. de 5L",
    "tags": [
      "5L",
      "Cx 4 un."
    ],
    "image_url": null,
    "peso_kg": 21.0,
    "volume_m3": 0
  },
  {
    "sku": "022",
    "name": "Limpador Perfumado Talco 2L",
    "category": "Limpadores e Multiuso",
    "units_per_box": 6,
    "prices": {
      "revenda": 47.4,
      "consumidor-final": 83.4
    },
    "suggested_sale_price": 12.64,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": "/pedidos/products/022.webp",
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "023",
    "name": "Limpador Perfumado Bamboo 2L",
    "category": "Limpadores e Multiuso",
    "units_per_box": 6,
    "prices": {
      "revenda": 47.4,
      "consumidor-final": 83.4
    },
    "suggested_sale_price": 12.64,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": null,
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "024",
    "name": "Limpador Perfumado Flor de Laranjeira 2L",
    "category": "Limpadores e Multiuso",
    "units_per_box": 6,
    "prices": {
      "revenda": 47.4,
      "consumidor-final": 83.4
    },
    "suggested_sale_price": 12.64,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": null,
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "025",
    "name": "Limpador Perfumado Lavanda 2L",
    "category": "Limpadores e Multiuso",
    "units_per_box": 6,
    "prices": {
      "revenda": 47.4,
      "consumidor-final": 83.4
    },
    "suggested_sale_price": 12.64,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": "/pedidos/products/025.webp",
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "026",
    "name": "Limpador Perfumado Lavanda 5L",
    "category": "Limpadores e Multiuso",
    "units_per_box": 4,
    "prices": {
      "revenda": 67.6,
      "consumidor-final": 103.6
    },
    "suggested_sale_price": 27.04,
    "short_use": "Caixa com 4 un. de 5L",
    "tags": [
      "5L",
      "Cx 4 un."
    ],
    "image_url": "/pedidos/products/026.webp",
    "peso_kg": 21.0,
    "volume_m3": 0
  },
  {
    "sku": "027",
    "name": "Multiuso 2L",
    "category": "Limpadores e Multiuso",
    "units_per_box": 6,
    "prices": {
      "revenda": 35.4,
      "consumidor-final": 47.4
    },
    "suggested_sale_price": 9.44,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": null,
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "028",
    "name": "Limpador Concentrado Gel 2L",
    "category": "Limpadores e Multiuso",
    "units_per_box": 6,
    "prices": {
      "revenda": 50.4,
      "consumidor-final": 83.4
    },
    "suggested_sale_price": 13.44,
    "short_use": "Caixa com 6 un. de 2L",
    "tags": [
      "2L",
      "Cx 6 un."
    ],
    "image_url": "/pedidos/products/028.webp",
    "peso_kg": 12.6,
    "volume_m3": 0
  },
  {
    "sku": "029",
    "name": "Limpador Concentrado Gel 5L",
    "category": "Limpadores e Multiuso",
    "units_per_box": 4,
    "prices": {
      "revenda": 83.6,
      "consumidor-final": 107.6
    },
    "suggested_sale_price": 33.44,
    "short_use": "Caixa com 4 un. de 5L",
    "tags": [
      "5L",
      "Cx 4 un."
    ],
    "image_url": "/pedidos/products/029.webp",
    "peso_kg": 21.0,
    "volume_m3": 0
  },
  {
    "sku": "030",
    "name": "Multiuso Flotador 5L",
    "category": "Limpadores e Multiuso",
    "units_per_box": 4,
    "prices": {
      "revenda": null,
      "consumidor-final": 83.6
    },
    "suggested_sale_price": null,
    "short_use": "Caixa com 4 un. de 5L",
    "tags": [
      "5L",
      "Cx 4 un."
    ],
    "image_url": null,
    "peso_kg": 21.0,
    "volume_m3": 0
  }
]

export const CATEGORIES = [
  {
    "name": "Água Sanitária e Alvejante",
    "slug": "agua-sanitaria-alvejante",
    "icon": "🧴",
    "position": 1
  },
  {
    "name": "Amaciantes",
    "slug": "amaciantes",
    "icon": "🌸",
    "position": 2
  },
  {
    "name": "Desinfetantes",
    "slug": "desinfetantes",
    "icon": "🧼",
    "position": 3
  },
  {
    "name": "Detergentes",
    "slug": "detergentes",
    "icon": "🍽️",
    "position": 4
  },
  {
    "name": "Lava Roupas",
    "slug": "lava-roupas",
    "icon": "👕",
    "position": 5
  },
  {
    "name": "Limpadores e Multiuso",
    "slug": "limpadores-multiuso",
    "icon": "✨",
    "position": 6
  }
]

export const PRICE_TABLES = [
  { name: 'Revenda', slug: 'revenda', description: 'Revendedores · pedido mínimo R$ 1.500,00', distance_min_km: null, distance_max_km: null, minimum_order_value: 1500, show_suggested_sale: true },
  { name: 'Consumidor final', slug: 'consumidor-final', description: 'Venda direta ao consumidor · sem pedido mínimo', distance_min_km: null, distance_max_km: null, minimum_order_value: 0, show_suggested_sale: false },
]

export const PAYMENT_TERMS = [
  { label: 'À vista (PIX/dinheiro)', days: '0', position: 1 },
  { label: 'Boleto 7 dias', days: '7', position: 2 },
  { label: 'Boleto 14 dias', days: '14', position: 3 },
  { label: 'Boleto 28 dias', days: '28', position: 4 },
  { label: '28/35', days: '28,35', position: 5 },
  { label: '30/60', days: '30,60', position: 6 },
]
