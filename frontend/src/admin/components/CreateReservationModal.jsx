import { useEffect, useState } from 'react';
import { criarReservaManual } from '../api/agendamentos';
import { listarServicos } from '../api/servicos';
import { paraChave } from '../../utils/datas';
import AdminModal from './AdminModal';

/**
 * Reserva manual (quem liga ou chega sem conta): só nome, serviço, duração, dia e hora.
 * Sem telefone/e-mail e sem criar cliente. O servidor confere expediente e conflito de horário.
 */
const CreateReservationModal = ({ onClose, onCreated, dataInicial }) => {
  const [servicos, setServicos] = useState([]);
  const [nome, setNome] = useState('');
  const [servicoId, setServicoId] = useState('');
  const [duracao, setDuracao] = useState('');
  const [data, setData] = useState(dataInicial ?? '');
  const [hora, setHora] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    listarServicos()
      .then((lista) => !cancelado && setServicos(lista.filter((s) => s.status === 'ativo')))
      .catch((err) => !cancelado && setErro(err.message));
    return () => {
      cancelado = true;
    };
  }, []);

  // Ao escolher o serviço, sugere a duração dele (o barbeiro pode ajustar para esta reserva).
  const handleServico = (id) => {
    setServicoId(id);
    const servico = servicos.find((s) => s.id === id);
    if (servico) setDuracao(String(servico.duration));
  };

  const pronto = nome.trim() && servicoId && Number(duracao) >= 5 && data && hora;

  const handleSubmit = async () => {
    setErro('');
    setSalvando(true);
    try {
      await criarReservaManual({
        nome: nome.trim(),
        servicoId,
        duracaoMinutos: Number(duracao),
        data,
        hora,
      });
      onCreated('Reserva criada.');
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  };

  return (
    <AdminModal
      title="Criar Reserva Manual"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline-secondary" onClick={onClose} disabled={salvando}>
            ← Voltar
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!pronto || salvando}>
            {salvando ? 'Salvando…' : 'Salvar Reserva'}
          </button>
        </>
      }
    >
      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label" htmlFor="reserva-nome">Nome *</label>
          <input
            id="reserva-nome"
            type="text"
            className="form-control"
            maxLength={120}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome de quem vai ser atendido"
          />
        </div>
        <div className="col-md-8">
          <label className="form-label" htmlFor="reserva-servico">Serviço *</label>
          <select id="reserva-servico" className="form-select" value={servicoId} onChange={(e) => handleServico(e.target.value)}>
            <option value="">Selecione…</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="reserva-duracao">Duração (min) *</label>
          <input
            id="reserva-duracao"
            type="number"
            className="form-control"
            min={5}
            max={480}
            value={duracao}
            onChange={(e) => setDuracao(e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="reserva-data">Dia *</label>
          <input
            id="reserva-data"
            type="date"
            className="form-control"
            min={paraChave(new Date())}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="reserva-hora">Horário *</label>
          <input
            id="reserva-hora"
            type="time"
            className="form-control"
            min="08:00"
            max="18:00"
            step={300}
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
        </div>
      </div>
      <p className="small text-secondary mt-3 mb-0">
        Funcionamento: segunda a sábado, das 08:00 às 18:00. O atendimento precisa terminar até as 18:00 e não pode
        coincidir com outro horário já marcado.
      </p>
    </AdminModal>
  );
};

export default CreateReservationModal;
