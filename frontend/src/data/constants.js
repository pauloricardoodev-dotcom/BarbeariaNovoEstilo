export const PROS = [
  { id: 'mariana', name: 'Mariana Silva', role: 'Cabeleireira', desc: 'Especialista em cortes', initials: 'MS' },
  { id: 'lucas', name: 'Lucas Almeida', role: 'Cabeleireiro', desc: 'Especialista em cortes masculinos', initials: 'LA' },
  { id: 'beatriz', name: 'Beatriz Costa', role: 'Hair Stylist', desc: 'Especialista em coloração', initials: 'BC' },
];

export const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const TIMES_MANHA = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
export const TIMES_TARDE = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

export const STEP_LABELS = ['Serviço', 'Data e horário', 'Pagamento'];

export const HERO_STATS = [
  { icon: 'calendar', value: '24+', label: 'Anos de tradição' },
  { icon: 'scissors', value: '3', label: 'Especialistas' },
  { icon: 'star', value: '4.9', label: 'Avaliação média' },
];

// Página de avaliação da barbearia no Google (pedida ao cliente depois que ele avalia no site).
// Pode ser trocada sem mexer no código com VITE_GOOGLE_AVALIACAO_URL no frontend/.env.
export const GOOGLE_AVALIACAO_URL =
  import.meta.env.VITE_GOOGLE_AVALIACAO_URL ||
  'https://www.google.com/searchviewer/10?client=ms-android-samsung-ss&hs=HcUB&sca_esv=bb5cc9c9a01072fb&output=search&svid=CAwSHRIbCgNwdnESFENnMHZaeTh4TVdOc2REbDZibWg2GAo#sv=CAESzQEKuQEStgEKd0FKaVQ0dEw3dl9FY21ERlZKR3VVYjNtbW5JQUFZcE10cURZZmY5WDYxc19BYUdra1JMZ3dCRmdNeUtKX2ZEVHZGWDNsTlhfS0RHeHc1LS1abzVkeWNHWVZxOEF5WDlGOGRScnk2OEoweHJEYnBfYV9yUldxeERzEhdoWEhTYXRYUUN0SE41T1VQMFlPcXFRRRoiQURzcjlmUzFKY1l2S0FndTRLdnVMRnB5bTNmU1g3WUNUURIEODA1MRoBMyoAMAA4AUAAGAAgydDekAxKAhAB';
