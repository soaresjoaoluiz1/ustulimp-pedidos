/** Dados da empresa num lugar só (rodapé, login, impressão do pedido, WhatsApp). */
export const COMPANY = {
  name: 'Ustulimp',
  tagline: 'Produtos de limpeza em geral e químico',
  cnpj: '55.300.717/0001-40',
  address: 'Av. Octorino Maestro, 432 · Jardim das Acácias · Igaraçu do Tietê/SP',
  /** Só dígitos com DDI, ex: '5514999999999'. Vazio = esconde os botões de WhatsApp. */
  whatsapp: '5514998124742',
  whatsappLabel: '(14) 99812-4742',
  email: '',
  portalUrl: 'https://ustulimp.com.br/pedidos',
}

/** Link wa.me com mensagem pronta, ou null se o WhatsApp ainda não foi configurado. */
export function waLink(text: string): string | null {
  return COMPANY.whatsapp ? `https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent(text)}` : null
}
