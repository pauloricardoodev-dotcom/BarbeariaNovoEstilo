export const appointments = [
  // Agendados
  {
    id: 1,
    date: '12/09/2026',
    time: '09:00',
    client: {
      name: 'Ana Souza',
      phone: '(44) 99999-1111',
      initials: 'AS'
    },
    service: {
      name: 'Corte Feminino',
      price: 80.00
    },
    professional: {
      name: 'Mariana Silva',
      role: 'Cabeleireira'
    },
    status: 'agendado'
  },
  {
    id: 2,
    date: '12/09/2026',
    time: '10:00',
    client: {
      name: 'João Silva',
      phone: '(44) 98888-2222',
      initials: 'JS'
    },
    service: {
      name: 'Corte Masculino',
      price: 50.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'agendado'
  },
  {
    id: 3,
    date: '12/09/2026',
    time: '10:30',
    client: {
      name: 'Maria Santos',
      phone: '(44) 97777-3333',
      initials: 'MS'
    },
    service: {
      name: 'Hidratação',
      price: 70.00
    },
    professional: {
      name: 'Beatriz Costa',
      role: 'Hair Stylist'
    },
    status: 'concluido'
  },
  {
    id: 4,
    date: '12/09/2026',
    time: '14:00',
    client: {
      name: 'Pedro Oliveira',
      phone: '(44) 96666-4444',
      initials: 'PO'
    },
    service: {
      name: 'Corte Masculino',
      price: 50.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'agendado'
  },
  {
    id: 5,
    date: '12/09/2026',
    time: '15:00',
    client: {
      name: 'Carla Dias',
      phone: '(44) 95555-5555',
      initials: 'CD'
    },
    service: {
      name: 'Escova',
      price: 60.00
    },
    professional: {
      name: 'Mariana Silva',
      role: 'Cabeleireira'
    },
    status: 'agendado'
  },
  // Concluídos
  {
    id: 6,
    date: '11/09/2026',
    time: '09:30',
    client: {
      name: 'Roberto Costa',
      phone: '(44) 94444-6666',
      initials: 'RC'
    },
    service: {
      name: 'Corte Masculino',
      price: 50.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'concluido'
  },
  {
    id: 7,
    date: '11/09/2026',
    time: '11:00',
    client: {
      name: 'Fernanda Lima',
      phone: '(44) 93333-7777',
      initials: 'FL'
    },
    service: {
      name: 'Corte Feminino',
      price: 80.00
    },
    professional: {
      name: 'Mariana Silva',
      role: 'Cabeleireira'
    },
    status: 'concluido'
  },
  {
    id: 8,
    date: '11/09/2026',
    time: '14:30',
    client: {
      name: 'Marcos Paulo',
      phone: '(44) 92222-8888',
      initials: 'MP'
    },
    service: {
      name: 'Corte Infantil',
      price: 40.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'concluido'
  },
  {
    id: 9,
    date: '11/09/2026',
    time: '16:00',
    client: {
      name: 'Juliana Martins',
      phone: '(44) 91111-9999',
      initials: 'JM'
    },
    service: {
      name: 'Coloração',
      price: 150.00
    },
    professional: {
      name: 'Beatriz Costa',
      role: 'Hair Stylist'
    },
    status: 'concluido'
  },
  // Cancelados
  {
    id: 10,
    date: '10/09/2026',
    time: '10:00',
    client: {
      name: 'André Souza',
      phone: '(44) 90000-0000',
      initials: 'AS'
    },
    service: {
      name: 'Corte Masculino',
      price: 50.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'cancelado'
  },
  {
    id: 11,
    date: '10/09/2026',
    time: '15:30',
    client: {
      name: 'Patricia Rocha',
      phone: '(44) 89999-1111',
      initials: 'PR'
    },
    service: {
      name: 'Hidratação',
      price: 70.00
    },
    professional: {
      name: 'Beatriz Costa',
      role: 'Hair Stylist'
    },
    status: 'cancelado'
  },
  // Dia completamente ocupado (13/09/2026)
  {
    id: 12,
    date: '13/09/2026',
    time: '09:00',
    client: {
      name: 'Carlos Ferreira',
      phone: '(44) 88888-2222',
      initials: 'CF'
    },
    service: {
      name: 'Corte Masculino',
      price: 50.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'agendado'
  },
  {
    id: 13,
    date: '13/09/2026',
    time: '09:30',
    client: {
      name: 'Mariana Gonçalves',
      phone: '(44) 87777-3333',
      initials: 'MG'
    },
    service: {
      name: 'Corte Feminino',
      price: 80.00
    },
    professional: {
      name: 'Mariana Silva',
      role: 'Cabeleireira'
    },
    status: 'agendado'
  },
  {
    id: 14,
    date: '13/09/2026',
    time: '10:00',
    client: {
      name: 'Ricardo Mendes',
      phone: '(44) 86666-4444',
      initials: 'RM'
    },
    service: {
      name: 'Corte Masculino',
      price: 50.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'agendado'
  },
  {
    id: 15,
    date: '13/09/2026',
    time: '10:30',
    client: {
      name: 'Amanda Nunes',
      phone: '(44) 85555-5555',
      initials: 'AN'
    },
    service: {
      name: 'Escova',
      price: 60.00
    },
    professional: {
      name: 'Mariana Silva',
      role: 'Cabeleireira'
    },
    status: 'agendado'
  },
  {
    id: 16,
    date: '13/09/2026',
    time: '11:00',
    client: {
      name: 'Felipe Barbosa',
      phone: '(44) 84444-6666',
      initials: 'FB'
    },
    service: {
      name: 'Corte Infantil',
      price: 40.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'agendado'
  },
  {
    id: 17,
    date: '13/09/2026',
    time: '11:30',
    client: {
      name: 'Bruna Cardoso',
      phone: '(44) 83333-7777',
      initials: 'BC'
    },
    service: {
      name: 'Hidratação',
      price: 70.00
    },
    professional: {
      name: 'Beatriz Costa',
      role: 'Hair Stylist'
    },
    status: 'agendado'
  },
  {
    id: 18,
    date: '13/09/2026',
    time: '14:00',
    client: {
      name: 'Gustavo Almeida',
      phone: '(44) 82222-8888',
      initials: 'GA'
    },
    service: {
      name: 'Corte Masculino',
      price: 50.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'agendado'
  },
  {
    id: 19,
    date: '13/09/2026',
    time: '14:30',
    client: {
      name: 'Leticia Pereira',
      phone: '(44) 81111-9999',
      initials: 'LP'
    },
    service: {
      name: 'Coloração',
      price: 150.00
    },
    professional: {
      name: 'Beatriz Costa',
      role: 'Hair Stylist'
    },
    status: 'agendado'
  },
  {
    id: 20,
    date: '13/09/2026',
    time: '15:00',
    client: {
      name: 'Thiago Rocha',
      phone: '(44) 80000-0000',
      initials: 'TR'
    },
    service: {
      name: 'Corte Masculino',
      price: 50.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'agendado'
  },
  {
    id: 21,
    date: '13/09/2026',
    time: '15:30',
    client: {
      name: 'Camila Santos',
      phone: '(44) 79999-1111',
      initials: 'CS'
    },
    service: {
      name: 'Corte Feminino',
      price: 80.00
    },
    professional: {
      name: 'Mariana Silva',
      role: 'Cabeleireira'
    },
    status: 'agendado'
  },
  {
    id: 22,
    date: '13/09/2026',
    time: '16:00',
    client: {
      name: 'Diego Lima',
      phone: '(44) 78888-2222',
      initials: 'DL'
    },
    service: {
      name: 'Corte Masculino',
      price: 50.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'agendado'
  },
  {
    id: 23,
    date: '13/09/2026',
    time: '16:30',
    client: {
      name: 'Fernanda Costa',
      phone: '(44) 77777-3333',
      initials: 'FC'
    },
    service: {
      name: 'Escova',
      price: 60.00
    },
    professional: {
      name: 'Mariana Silva',
      role: 'Cabeleireira'
    },
    status: 'agendado'
  },
  // Mais agendamentos para outros dias
  {
    id: 24,
    date: '14/09/2026',
    time: '09:00',
    client: {
      name: 'Lucas Oliveira',
      phone: '(44) 76666-4444',
      initials: 'LO'
    },
    service: {
      name: 'Corte Masculino',
      price: 50.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'agendado'
  },
  {
    id: 25,
    date: '14/09/2026',
    time: '14:00',
    client: {
      name: 'Isabela Martins',
      phone: '(44) 75555-5555',
      initials: 'IM'
    },
    service: {
      name: 'Hidratação',
      price: 70.00
    },
    professional: {
      name: 'Beatriz Costa',
      role: 'Hair Stylist'
    },
    status: 'agendado'
  },
  {
    id: 26,
    date: '15/09/2026',
    time: '10:00',
    client: {
      name: 'Rafaela Silva',
      phone: '(44) 74444-6666',
      initials: 'RS'
    },
    service: {
      name: 'Corte Feminino',
      price: 80.00
    },
    professional: {
      name: 'Mariana Silva',
      role: 'Cabeleireira'
    },
    status: 'agendado'
  },
  {
    id: 27,
    date: '15/09/2026',
    time: '15:00',
    client: {
      name: 'Bruno Ferreira',
      phone: '(44) 73333-7777',
      initials: 'BF'
    },
    service: {
      name: 'Corte Masculino',
      price: 50.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'agendado'
  },
  // Additional appointments for current month
  {
    id: 28,
    date: '19/09/2026',
    time: '09:00',
    client: {
      name: 'Camila Oliveira',
      phone: '(44) 72222-8888',
      initials: 'CO'
    },
    service: {
      name: 'Corte Feminino',
      price: 80.00
    },
    professional: {
      name: 'Mariana Silva',
      role: 'Cabeleireira'
    },
    status: 'concluido'
  },
  {
    id: 29,
    date: '19/09/2026',
    time: '10:30',
    client: {
      name: 'Ricardo Santos',
      phone: '(44) 71111-9999',
      initials: 'RS'
    },
    service: {
      name: 'Corte Masculino',
      price: 50.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'concluido'
  },
  {
    id: 30,
    date: '19/09/2026',
    time: '14:00',
    client: {
      name: 'Fernanda Lima',
      phone: '(44) 70000-0000',
      initials: 'FL'
    },
    service: {
      name: 'Hidratação',
      price: 70.00
    },
    professional: {
      name: 'Beatriz Costa',
      role: 'Hair Stylist'
    },
    status: 'agendado'
  },
  {
    id: 31,
    date: '18/09/2026',
    time: '09:30',
    client: {
      name: 'Paulo Roberto',
      phone: '(44) 69999-1111',
      initials: 'PR'
    },
    service: {
      name: 'Corte Infantil',
      price: 40.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'concluido'
  },
  {
    id: 32,
    date: '18/09/2026',
    time: '11:00',
    client: {
      name: 'Ana Carolina',
      phone: '(44) 68888-2222',
      initials: 'AC'
    },
    service: {
      name: 'Coloração',
      price: 150.00
    },
    professional: {
      name: 'Beatriz Costa',
      role: 'Hair Stylist'
    },
    status: 'concluido'
  },
  {
    id: 33,
    date: '17/09/2026',
    time: '15:30',
    client: {
      name: 'Marcos Vinicius',
      phone: '(44) 67777-3333',
      initials: 'MV'
    },
    service: {
      name: 'Corte Masculino',
      price: 50.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'concluido'
  },
  {
    id: 34,
    date: '16/09/2026',
    time: '10:00',
    client: {
      name: 'Juliana Ferreira',
      phone: '(44) 66666-4444',
      initials: 'JF'
    },
    service: {
      name: 'Escova',
      price: 60.00
    },
    professional: {
      name: 'Mariana Silva',
      role: 'Cabeleireira'
    },
    status: 'concluido'
  },
  {
    id: 35,
    date: '16/09/2026',
    time: '14:30',
    client: {
      name: 'Roberto Carlos',
      phone: '(44) 65555-5555',
      initials: 'RC'
    },
    service: {
      name: 'Corte Masculino',
      price: 50.00
    },
    professional: {
      name: 'Lucas Almeida',
      role: 'Cabeleireiro'
    },
    status: 'concluido'
  }
];

export const stats = {
  today: 6,
  week: 23,
  totalClients: 128,
  attendanceRate: 92
};

export const statusLabels = {
  agendado: 'Agendado',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

export const services = [
  { id: 1, name: 'Corte Feminino', price: 80, duration: 60, description: 'Corte feminino com lavagem e finalização', status: 'ativo' },
  { id: 2, name: 'Corte Masculino', price: 50, duration: 45, description: 'Corte masculino tradicional', status: 'ativo' },
  { id: 3, name: 'Corte Infantil', price: 40, duration: 40, description: 'Corte para crianças até 12 anos', status: 'ativo' },
  { id: 4, name: 'Escova', price: 60, duration: 45, description: 'Escova progressiva ou modeladora', status: 'ativo' },
  { id: 5, name: 'Hidratação', price: 70, duration: 60, description: 'Hidratação profunda dos fios', status: 'ativo' },
  { id: 6, name: 'Coloração', price: 150, duration: 120, description: 'Coloração completa dos fios', status: 'ativo' }
];

export const professionals = [
  { id: 1, name: 'Mariana Silva', role: 'Cabeleireira', initials: 'MS', status: 'ativo' },
  { id: 2, name: 'Lucas Almeida', role: 'Cabeleireiro', initials: 'LA', status: 'ativo' },
  { id: 3, name: 'Beatriz Costa', role: 'Hair Stylist', initials: 'BC', status: 'ativo' }
];