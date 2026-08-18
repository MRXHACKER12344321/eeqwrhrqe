export interface RecoverySegmentDef {
  id: string;
  label: string;
  badge: string;
  description: string;
  defaultTemplates: string[];
  filter: (client: any) => boolean;
}

export const RECOVERY_SEGMENTS: RecoverySegmentDef[] = [
  {
    id: 'all',
    label: 'Todos os Clientes',
    badge: 'Base Geral',
    description: 'Toda a base de clientes cadastrados na sua loja.',
    filter: () => true,
    defaultTemplates: [
      "Olá, {nome}! 👋 Tem novidade saindo por aqui. Que tal dar uma olhada no nosso cardápio hoje? 🍔 {link_pedido}",
      "Oi, {nome}! 😋 Já decidiu o que vai pedir hoje? Estamos esperando seu pedido! {link_pedido}",
      "🔥 {nome}, hoje é um ótimo dia para pedir aquele lanche que você gosta! Dá uma olhada: {link_pedido}",
      "Oi, {nome}! 👀 Passando para avisar que tem coisa boa esperando por você! Acesse: {link_pedido}",
      "🍔 Bateu aquela fome, {nome}? Dá uma olhada nas opções de hoje! {link_pedido}",
      "{nome}, seu próximo pedido pode estar a um clique de distância! 😋 {link_pedido}",
      "Hoje combina com um pedido caprichado, não acha, {nome}? ❤️ Peça aqui: {link_pedido}",
      "🚨 Tem novidade no cardápio! Vem conferir, {nome}: {link_pedido}",
      "Oi, {nome}! Que tal pedir algo gostoso hoje? 🍟 {link_pedido}",
      "🔥 Seu próximo pedido está esperando por você, {nome}! {link_pedido}"
    ]
  },
  {
    id: 'custom_days',
    label: 'Personalizado (Escolher Dias)',
    badge: '1 a 30+ dias',
    description: 'Filtre exatamente quantos dias o cliente está sem comprar (ex: 3 dias, 5 dias, 10 dias).',
    filter: (c: any) => c.diasSemComprar >= 3 && c.diasSemComprar < 999,
    defaultTemplates: [
      "Oi, {nome}! 👋 Já faz {dias_sem_comprar} dias desde seu último pedido! Sentimos sua falta: {link_pedido}",
      "{nome}, {dias_sem_comprar} dias sem aparecer por aqui? 👀 Que tal pedir aquele lanche caprichado hoje? {link_pedido}",
      "Ei, {nome}! Notamos que faz {dias_sem_comprar} dias desde sua última visita. Preparamos uma surpresa: {cupom} {link_pedido}",
      "Sentimos sua falta, {nome}! ❤️ São {dias_sem_comprar} dias de saudade. Bora matar a vontade hoje? {link_pedido}",
      "🔥 {nome}, preparamos uma oferta exclusiva de {desconto} para você voltar hoje! Acesse: {link_pedido}",
      "Oi, {nome}! Passando para saber se está tudo bem! Já faz {dias_sem_comprar} dias sem seu pedido. Dá uma olhada nas delícias de hoje: {link_pedido}"
    ]
  },
  {
    id: 'never_bought_again',
    label: 'Nunca Compraram Novamente',
    badge: '1ª Compra Apenas',
    description: 'Clientes que fizeram apenas um único pedido e nunca mais voltaram para o segundo.',
    filter: (c: any) => c.total_pedidos === 1,
    defaultTemplates: [
      "Oi, {nome}! 👋 Você já experimentou a gente uma vez. Que tal dar uma segunda chance? ❤️ {link_pedido}",
      "{nome}, sua primeira experiência foi só o começo! 😋 Que tal pedir novamente? {link_pedido}",
      "Ei, {nome}! Já faz um tempo desde seu primeiro pedido. Bora para o segundo? 🍔 {link_pedido}",
      "Gostou do primeiro pedido, {nome}? Então você precisa experimentar nossas outras opções! 🔥 {link_pedido}",
      "{nome}, ainda falta transformar aquela primeira compra em hábito 😂🍔 Peça aqui: {link_pedido}",
      "Sentimos sua falta por aqui, {nome}! Que tal fazer seu segundo pedido? {link_pedido}",
      "🎁 {nome}, temos uma condição especial para você voltar e fazer seu próximo pedido: {cupom} {link_pedido}",
      "Seu primeiro pedido já aconteceu. Agora falta o segundo! 😎🍔 Acesse: {link_pedido}",
      "Oi, {nome}! Queremos te ver por aqui novamente. Preparamos uma surpresa: {cupom} 🎁 {link_pedido}",
      "{nome}, que tal repetir a experiência? Seu próximo pedido pode ser ainda melhor! ❤️ {link_pedido}"
    ]
  },
  {
    id: 'inactive_7',
    label: 'Inativos há 7 dias',
    badge: '7 dias sem pedir',
    description: 'Clientes ausentes há uma semana. Abordagem leve e descontraída.',
    filter: (c: any) => c.diasSemComprar >= 7 && c.diasSemComprar < 15,
    defaultTemplates: [
      "Oi, {nome}! 👋 Já faz uma semaninha que você não pede. Sentimos sua falta! ❤️ {link_pedido}",
      "{nome}, 7 dias sem aparecer por aqui? 👀 Bora matar a saudade? {link_pedido}",
      "Uma semana sem seu pedido, {nome}! 🍔 Que tal mudar isso hoje? {link_pedido}",
      "Ei, {nome}! Já faz 7 dias desde seu último pedido. Que tal pedir novamente? {link_pedido}",
      "🍟 A gente percebeu sua ausência, {nome}! Vem matar a saudade: {link_pedido}",
      "{nome}, seu último pedido deixou saudade por aqui! 😋 {link_pedido}",
      "7 dias passaram rápido, hein? 👀 Que tal pedir hoje? {link_pedido}",
      "Oi, {nome}! Seu próximo pedido pode ser hoje. Bora? {link_pedido}",
      "🔥 Hoje é um ótimo dia para voltar, {nome}! {link_pedido}",
      "Sentimos sua falta! ❤️ Vem pedir novamente, {nome}: {link_pedido}"
    ]
  },
  {
    id: 'inactive_15',
    label: 'Inativos há 15 dias',
    badge: '15 dias sem pedir',
    description: 'Clientes ausentes há 2 semanas. Abordagem moderada com incentivo.',
    filter: (c: any) => c.diasSemComprar >= 15 && c.diasSemComprar < 30,
    defaultTemplates: [
      "{nome}, já são 15 dias sem seu pedido! 😳 Que tal voltar hoje? {link_pedido}",
      "Oi, {nome}! Faz duas semanas que você não aparece. Sentimos sua falta! ❤️ {link_pedido}",
      "15 dias é tempo demais sem aquele pedido gostoso, hein? 🍔 {link_pedido}",
      "{nome}, bora acabar com essa saudade? Seu próximo pedido está a um clique! {link_pedido}",
      "👀 Você sumiu, {nome}! Que tal voltar hoje? {link_pedido}",
      "Faz 15 dias desde seu último pedido. Temos uma surpresa para você: {cupom} 🎁 {link_pedido}",
      "{nome}, seu histórico está pedindo um novo pedido 😂🍔 {link_pedido}",
      "❤️ Sentimos sua falta! Volte hoje e aproveite {desconto}: {link_pedido}",
      "15 dias sem pedir? Vamos resolver isso agora? 😋 {link_pedido}",
      "🔥 {nome}, temos uma condição especial para você voltar! {link_pedido}"
    ]
  },
  {
    id: 'inactive_30',
    label: 'Inativos há 30 dias',
    badge: '30 dias (1 mês)',
    description: 'Clientes ausentes há um mês. Recuperação mais direta com cupom ou desconto.',
    filter: (c: any) => c.diasSemComprar >= 30 && c.diasSemComprar < 60,
    defaultTemplates: [
      "{nome}, faz 30 dias que você não pede! 😱 Bora voltar? {link_pedido}",
      "Um mês sem você por aqui! ❤️ Sentimos sua falta, {nome}. {link_pedido}",
      "{nome}, seu último pedido já faz um mês. Temos uma condição especial para sua volta: {cupom}. {link_pedido}",
      "30 dias é muita saudade! 🍔 Volta hoje? {link_pedido}",
      "Ei, {nome}! Você faz falta por aqui. Que tal voltar com {desconto} de desconto? {link_pedido}",
      "🚨 {nome}, liberamos uma condição especial para você voltar! {link_pedido}",
      "Um mês longe é tempo demais! 😋 Bora pedir novamente? {link_pedido}",
      "{nome}, queremos te trazer de volta. Use {cupom} no próximo pedido! {link_pedido}",
      "❤️ Você sumiu! Temos uma oferta especial esperando por você: {link_pedido}",
      "🔥 Seu próximo pedido pode ser hoje. Aproveite {desconto}, {nome}! {link_pedido}"
    ]
  },
  {
    id: 'inactive_60',
    label: 'Inativos há 60 dias',
    badge: '60 dias (2 meses)',
    description: 'Clientes ausentes há 2 meses. Reativação forte e atrativa.',
    filter: (c: any) => c.diasSemComprar >= 60 && c.diasSemComprar < 90,
    defaultTemplates: [
      "{nome}, já são 60 dias! 😳 Sentimos muita falta de você. {link_pedido}",
      "Dois meses sem seu pedido! ❤️ Queremos você de volta: {link_pedido}",
      "{nome}, faz muito tempo desde a última vez. Preparamos uma condição especial: {cupom}. {link_pedido}",
      "👀 Você lembra da gente, {nome}? Porque a gente lembra de você! {link_pedido}",
      "60 dias é tempo demais! 🍔 Volte hoje e aproveite {desconto}: {link_pedido}",
      "{nome}, queremos te dar um motivo para voltar: {cupom} 🎁 {link_pedido}",
      "Seu último pedido foi há 60 dias. Que tal recomeçar hoje? {link_pedido}",
      "❤️ Sentimos sua falta, {nome}. Temos uma oferta exclusiva para sua volta: {link_pedido}",
      "🚨 Oferta especial para quem está há muito tempo sem pedir: {desconto}. {link_pedido}",
      "{nome}, vamos matar essa saudade? Seu cupom está esperando: {cupom}. {link_pedido}"
    ]
  },
  {
    id: 'inactive_90',
    label: 'Inativos há 90+ dias',
    badge: '90+ dias (Win-Back)',
    description: 'Campanha de Win-Back para resgatar clientes sumidos há mais de 3 meses.',
    filter: (c: any) => c.diasSemComprar >= 90,
    defaultTemplates: [
      "{nome}, faz mais de 90 dias! 😱 Será que está na hora de voltar? {link_pedido}",
      "Você sumiu de vez, {nome}! 😂 Mas ainda estamos aqui esperando você. {link_pedido}",
      "❤️ {nome}, queremos muito te ver novamente. Preparamos algo especial: {cupom}. {link_pedido}",
      "Mais de 3 meses sem pedir! Temos uma condição exclusiva para sua volta: {link_pedido}",
      "{nome}, muita coisa mudou desde seu último pedido. Vem conferir as novidades! 🔥 {link_pedido}",
      "👀 Lembra daquele pedido que você fez? Que tal experimentar novamente? {link_pedido}",
      "🚨 CONDIÇÃO ESPECIAL: {nome}, volte hoje e aproveite {desconto}: {link_pedido}",
      "Mais de 90 dias sem você. Bora mudar isso hoje? 🍔 {link_pedido}",
      "{nome}, seu retorno merece um presente: {cupom} 🎁 {link_pedido}",
      "Sentimos sua falta por aqui. ❤️ Volte quando quiser, {nome}! {link_pedido}"
    ]
  },
  {
    id: 'vip',
    label: 'Clientes VIP',
    badge: '⭐ VIP / Mais Frequentes',
    description: 'Melhores clientes da casa. Abordagem de exclusividade e reconhecimento.',
    filter: (c: any) => c.is_vip || c.level === 'Ouro' || c.level === 'Prata',
    defaultTemplates: [
      "⭐ {nome}, você é cliente VIP. Por isso liberamos uma condição exclusiva para você: {link_pedido}",
      "{nome}, cliente como você merece tratamento especial. 🎁 Confira sua vantagem exclusiva: {link_pedido}",
      "👑 {nome}, temos uma oferta reservada especialmente para nossos melhores clientes: {link_pedido}",
      "⭐ Exclusivo para você, {nome}: {cupom}. Acesse: {link_pedido}",
      "{nome}, obrigado por estar sempre com a gente! ❤️ Temos uma surpresa para você: {link_pedido}",
      "👑 Seu histórico fala por você, {nome}. Agora é nossa vez de te presentear! {link_pedido}",
      "Você faz parte dos nossos clientes especiais, {nome}. Aproveite {desconto}: {link_pedido}",
      "🎁 {nome}, liberamos uma vantagem VIP para seu próximo pedido! {link_pedido}",
      "⭐ Condição exclusiva para você, {nome}. Aproveite enquanto estiver disponível: {link_pedido}",
      "Obrigado pela parceria, {nome}! ❤️ Seu benefício VIP está aqui: {cupom} {link_pedido}"
    ]
  },
  {
    id: 'high_ticket',
    label: 'Alto Ticket Médio',
    badge: '💰 Ticket Alto',
    description: 'Clientes que gastam valores elevados por compra. Foco em experiência e combos.',
    filter: (c: any) => c.ticketMedio >= 50,
    defaultTemplates: [
      "{nome}, você sempre escolhe bem! 😎 Preparamos uma condição especial para seu próximo pedido: {link_pedido}",
      "⭐ {nome}, queremos te oferecer uma experiência ainda melhor no seu próximo pedido: {link_pedido}",
      "Seu próximo pedido merece algo especial, {nome}. Aproveite {cupom}! {link_pedido}",
      "{nome}, temos uma condição exclusiva para você voltar hoje: {link_pedido}",
      "🔥 Liberamos uma vantagem especial para clientes como você, {nome}: {link_pedido}",
      "Que tal montar aquele pedido caprichado novamente? 😋 Temos uma condição especial: {link_pedido}",
      "{nome}, queremos agradecer por escolher a gente. Aproveite {desconto} no próximo pedido! {link_pedido}",
      "⭐ Seu próximo pedido tem benefício especial, {nome}! {link_pedido}",
      "{nome}, aproveite sua condição exclusiva: {cupom} {link_pedido}",
      "Uma condição especial para um cliente especial. ❤️ Aproveite, {nome}! {link_pedido}"
    ]
  },
  {
    id: 'recent',
    label: 'Compraram Recentemente',
    badge: '⚡ Recentes (Fidelização)',
    description: 'Clientes que compraram nos últimos dias. Foco em pós-venda e próximo pedido.',
    filter: (c: any) => c.diasSemComprar <= 6 && c.total_pedidos > 0,
    defaultTemplates: [
      "Oi, {nome}! 👋 Gostou do último pedido? Que tal experimentar outra opção? {link_pedido}",
      "{nome}, já está pensando no próximo? 😋 Dá uma olhada no cardápio: {link_pedido}",
      "🔥 Seu último pedido foi há pouco tempo. Que tal experimentar uma novidade? {link_pedido}",
      "Oi, {nome}! Temos novidades no cardápio que você pode gostar: {link_pedido}",
      "Que tal repetir seu favorito, {produto_favorito}? 🍔 Peça já: {link_pedido}",
      "{nome}, descobrimos uma opção que combina com seu último pedido! {link_pedido}",
      "❤️ Obrigado pelo seu pedido, {nome}! Esperamos que tenha gostado: {link_pedido}",
      "Queremos saber: como foi seu último pedido, {nome}? {link_pedido}",
      "🎁 Temos uma novidade esperando por você! {link_pedido}",
      "{nome}, pronto para o próximo? 😋 Acesse: {link_pedido}"
    ]
  },
  {
    id: 'never_received_campaign',
    label: 'Nunca Receberam Campanha',
    badge: '🆕 Sem Disparos Prévios',
    description: 'Clientes que ainda não receberam nenhuma mensagem de campanha. Apresentação gentil.',
    filter: (c: any) => !c.totalCampanhasRecebidas || c.totalCampanhasRecebidas === 0,
    defaultTemplates: [
      "Oi, {nome}! 👋 Aqui é do {nome_restaurante}. Temos uma novidade para você! {link_pedido}",
      "Olá, {nome}! 😋 Queremos te apresentar algumas novidades do nosso cardápio: {link_pedido}",
      "Oi, {nome}! Temos uma condição especial para você conhecer melhor nosso cardápio: {link_pedido}",
      "👋 {nome}, passando para te mostrar uma novidade que pode te interessar! {link_pedido}",
      "Olá, {nome}! 🎁 Temos uma surpresa esperando por você: {link_pedido}",
      "{nome}, já conhece todas as opções do nosso cardápio? Dá uma olhada: {link_pedido}",
      "🔥 Temos novidades por aqui, {nome}! Venha conferir: {link_pedido}",
      "Oi, {nome}! Quer receber uma condição especial para seu próximo pedido? {link_pedido}",
      "🍔 {nome}, tem coisa nova saindo da cozinha! {link_pedido}",
      "Seja bem-vindo, {nome}! ❤️ Queremos te mostrar o que temos de melhor: {link_pedido}"
    ]
  }
];

export interface AiObjectiveOption {
  id: string;
  label: string;
  description: string;
  emoji: string;
}

export const AI_OBJECTIVES: AiObjectiveOption[] = [
  { id: 'recuperar', label: 'Recuperar cliente', description: 'Reativar quem está ausente', emoji: '🔄' },
  { id: 'desconto', label: 'Oferecer desconto', description: 'Atrair com incentivo financeiro', emoji: '🏷️' },
  { id: 'lancamento', label: 'Divulgar lançamento', description: 'Apresentar novos produtos do cardápio', emoji: '✨' },
  { id: 'promocao', label: 'Divulgar promoção', description: 'Oferta relâmpago ou combo especial', emoji: '🔥' },
  { id: 'vip', label: 'Cliente VIP', description: 'Tratamento exclusivo para os mais fiéis', emoji: '⭐' },
  { id: 'carrinho', label: 'Abandonou compra', description: 'Resgate de intenção de compra', emoji: '🛒' },
  { id: 'muito_tempo', label: 'Não compra há muito tempo', description: 'Campanha de Win-Back profundo', emoji: '⏳' }
];

export function generateAiMessageVariations(
  objectiveId: string,
  arg1?: any,
  arg2?: any
): { curta: string; persuasiva: string; humanizada: string } {
  let storeName = 'Nosso Restaurante';
  if (typeof arg1 === 'string') {
    storeName = arg1;
  } else if (arg1 && typeof arg1 === 'object') {
    storeName = arg1.storeName || arg1.nome || 'Nosso Restaurante';
  }

  switch (objectiveId) {
    case 'desconto':
      return {
        curta: `Oi, {nome}! 🎟️ Ganhe {desconto} no seu pedido hoje no ${storeName} com o cupom {cupom}: {link_pedido}`,
        persuasiva: `🚨 {nome}, só hoje liberamos uma condição imperdível: aproveite {desconto} no seu lanche usando {cupom}. Não perca tempo, peça agora: {link_pedido}`,
        humanizada: `Olá, {nome}! ❤️ Tudo bem com você? Separamos um presentinho especial para alegrar seu dia: {desconto} de desconto com {cupom}. Esperamos seu pedido! {link_pedido}`
      };
    case 'lancamento':
      return {
        curta: `🔥 Tem novidade quente no cardápio do ${storeName}, {nome}! Venha provar: {link_pedido}`,
        persuasiva: `🍔 {nome}, nossa cozinha acabou de criar uma novidade irresistível! Peça hoje e seja um dos primeiros a experimentar: {link_pedido}`,
        humanizada: `Oi, {nome}! Passando para te contar em primeira mão que preparamos novas receitas deliciosas por aqui. Quando puder, dá uma olhadinha: {link_pedido} ✨`
      };
    case 'promocao':
      return {
        curta: `⚡ Super Promoção no ${storeName}, {nome}! Confira as ofertas de hoje: {link_pedido}`,
        persuasiva: `🔥 Bateu a fome, {nome}? Hoje tem combo especial com valor promocional por tempo limitado! Garanta o seu antes que acabe: {link_pedido}`,
        humanizada: `Oi, {nome}! Tudo bem? Hoje preparamos um combo especial com muito carinho pensando em você. Que tal pedir hoje? {link_pedido} 😋`
      };
    case 'vip':
      return {
        curta: `⭐ {nome}, benefício VIP liberado para você no ${storeName}: {cupom} em {link_pedido}`,
        persuasiva: `👑 {nome}, como um dos nossos clientes mais especiais, reservamos uma vantagem exclusiva para seu próximo pedido: {cupom}. Acesse seu acesso VIP: {link_pedido}`,
        humanizada: `Olá, {nome}! Passando para agradecer de coração por sua preferência. Clientes queridos como você merecem um carinho especial: use {cupom} no seu próximo pedido! ❤️ {link_pedido}`
      };
    case 'carrinho':
      return {
        curta: `👀 {nome}, seu pedido está quase pronto! Finalize com facilidade: {link_pedido}`,
        persuasiva: `🍔 Ficou com vontade, {nome}? Seu lanche delicioso está te esperando. Finalize em 1 minuto e receba quentinho: {link_pedido}`,
        humanizada: `Oi, {nome}! Notamos que você deu uma olhada no nosso cardápio. Se precisar de alguma ajuda para escolher ou quiser tirar dúvidas, estamos por aqui! ❤️ {link_pedido}`
      };
    case 'muito_tempo':
      return {
        curta: `😱 Faz {dias_sem_comprar} dias sem você, {nome}! Volte com {cupom}: {link_pedido}`,
        persuasiva: `🚨 {nome}, já faz mais de {dias_sem_comprar} dias desde seu último pedido ({ultimo_pedido}). Queremos muito te ver de novo: liberamos {cupom} para seu retorno hoje! {link_pedido}`,
        humanizada: `Oi, {nome}! Sentimos tanta saudade de você por aqui! Muita coisa gostosa mudou no nosso cardápio desde a última vez. Preparamos uma surpresa com carinho para sua volta: {cupom} ❤️ {link_pedido}`
      };
    case 'recuperar':
    default:
      return {
        curta: `Oi, {nome}! 👋 Sentimos sua falta no ${storeName}! Que tal pedir hoje? {link_pedido}`,
        persuasiva: `🔥 {nome}, já faz {dias_sem_comprar} dias desde seu último pedido! Preparamos uma surpresa exclusiva para seu retorno hoje com o cupom {cupom}: {link_pedido}`,
        humanizada: `Olá, {nome}! Tudo bem com você? A equipe do ${storeName} notou que faz um tempinho que você não aparece. Preparamos uma condição especial para matar a saudade: {link_pedido} ❤️`
      };
  }
}

export function getStorePublicUrl(store?: any, cupom?: string): string {
  let baseUrl = '';
  if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
    baseUrl = window.location.origin;
  }
  if (!baseUrl) {
    baseUrl = 'https://pedifacil.online';
  }

  const rawSlug = String(store?.slug || store?.nome || store?.name || '').trim().toLowerCase();
  const cleanSlug = rawSlug
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const queryParam = cupom ? `?cupom=${encodeURIComponent(cupom)}` : '';
  return `${baseUrl}/#${cleanSlug}${queryParam}`;
}

export function replaceTemplateVariables(
  template: string,
  arg1?: any,
  arg2?: any,
  arg3?: any
): string {
  if (!template) return '';
  
  let client: any = {};
  let offer: any = {};
  let store: any = {};

  if (arg1 && typeof arg1 === 'object') {
    if ('client' in arg1 || 'store' in arg1) {
      client = arg1.client || {};
      store = arg1.store || {};
      offer = {
        cupomCodigo: arg1.cupom || arg1.cupomCodigo,
        descontoTexto: arg1.desconto || arg1.descontoTexto,
        ...arg1
      };
    } else {
      client = arg1;
      offer = arg2 || {};
      store = arg3 || {};
    }
  }

  const firstName = (client?.nome || 'Cliente').trim().split(' ')[0];
  const dias = client?.diasSemComprar !== undefined && client?.diasSemComprar !== 999 
    ? `${client.diasSemComprar}` 
    : 'alguns';
  const ultimoPedido = client?.ultimoPedidoResumo || client?.ultimoPedidoObj?.itens?.[0]?.name || 'seu pedido anterior';
  const valorUltimo = client?.ultimoPedidoValor 
    ? `R$ ${client.ultimoPedidoValor.toFixed(2)}` 
    : client?.ultimoPedidoObj?.total 
    ? `R$ ${Number(client.ultimoPedidoObj.total).toFixed(2)}`
    : 'R$ 0,00';
  const cupom = offer?.cupomCodigo || offer?.cupom || '';
  const desconto = offer?.descontoTexto || offer?.desconto || '10% OFF';
  const storeName = store?.nome || 'Nosso Restaurante';
  const prodFav = client?.produtoFavorito || offer?.produto_favorito || 'seu lanche favorito';
  
  const storeUrl = getStorePublicUrl(store, cupom);

  return template
    .replace(/\{nome\}/gi, firstName)
    .replace(/\{dias_sem_comprar\}/gi, dias)
    .replace(/\{dias\}/gi, dias)
    .replace(/\{ultimo_pedido\}/gi, ultimoPedido)
    .replace(/\{valor_ultimo_pedido\}/gi, valorUltimo)
    .replace(/\{cupom\}/gi, cupom || 'VOLTA10')
    .replace(/\{desconto\}/gi, desconto)
    .replace(/\{nome_restaurante\}/gi, storeName)
    .replace(/\{produto_favorito\}/gi, prodFav)
    .replace(/\{link_pedido\}/gi, storeUrl)
    .replace(/\{link\}/gi, storeUrl);
}
