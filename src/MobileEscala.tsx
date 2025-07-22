import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EscalaData, Funcionario, DiaEscala } from './types';
import { dadosIniciais } from './data';
import './MobileEscala.css';

function gerarIdCompartilhamento() {
  return Math.random().toString(36).substr(2, 8) + Date.now().toString(36).substr(-4);
}

function MobileEscala() {
  const { linkId } = useParams();
  const navigate = useNavigate();
  const [escala, setEscala] = useState<EscalaData>(() => {
    if (linkId) {
      const saved = localStorage.getItem('escala-compartilhada-' + linkId);
      return saved ? JSON.parse(saved) : { funcionarios: [], dias: [] };
    } else {
      const savedEscala = localStorage.getItem('escala-horarios');
      return savedEscala ? JSON.parse(savedEscala) : dadosIniciais;
    }
  });
  const [mesAtual, setMesAtual] = useState<number>(7);
  const [anoAtual, setAnoAtual] = useState<number>(2024);
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (linkId && escala.funcionarios.length === 0) {
      // Se não encontrou escala, mostra alerta
      setLinkGerado('NOT_FOUND');
    }
  }, [linkId, escala]);

  const handleCompartilhar = () => {
    const id = gerarIdCompartilhamento();
    localStorage.setItem('escala-compartilhada-' + id, JSON.stringify(escala));
    const url = window.location.origin + '/mobile/' + id;
    setLinkGerado(url);
    // Redireciona para o link compartilhado para simular a experiência do funcionário
    navigate('/mobile/' + id);
  };

  const handleCopy = async () => {
    if (linkGerado && linkGerado !== 'NOT_FOUND') {
      try {
        await navigator.clipboard.writeText(linkGerado);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 3000);
      } catch {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement('textarea');
        textArea.value = linkGerado;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 3000);
      }
    }
  };

  const meses = [
    { valor: 1, nome: 'Janeiro' },
    { valor: 2, nome: 'Fevereiro' },
    { valor: 3, nome: 'Março' },
    { valor: 4, nome: 'Abril' },
    { valor: 5, nome: 'Maio' },
    { valor: 6, nome: 'Junho' },
    { valor: 7, nome: 'Julho' },
    { valor: 8, nome: 'Agosto' },
    { valor: 9, nome: 'Setembro' },
    { valor: 10, nome: 'Outubro' },
    { valor: 11, nome: 'Novembro' },
    { valor: 12, nome: 'Dezembro' }
  ];

  const anos = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

  const handleMesChange = (novoMes: number) => {
    setMesAtual(novoMes);
    setCurrentDayIndex(0);
  };

  const handleAnoChange = (novoAno: number) => {
    setAnoAtual(novoAno);
    setCurrentDayIndex(0);
  };

  const getNomeMes = (mes: number) => {
    return meses.find(m => m.valor === mes)?.nome || '';
  };

  const getDiasMes = (mes: number, ano: number) => {
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    const nomesDias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return Array.from({ length: diasNoMes }, (_, i) => {
      const dia = i + 1;
      const data = new Date(ano, mes - 1, dia);
      const diaSemana = diasSemana[data.getDay()];
      const nomeDia = nomesDias[data.getDay()];
      const dataFormatada = `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}`;
      return {
        dia,
        diaSemana,
        nomeDia,
        data: dataFormatada,
        mes
      };
    });
  };

  const getHorarioFuncionario = (dia: number, funcionarioId: number) => {
    const diaEscala = escala.dias.find(d => d.dia === dia);
    if (!diaEscala) {
      return '';
    }
    const horario = diaEscala.horarios.find(h => h.funcionarioId === funcionarioId);
    return horario ? horario.horario : '';
  };

  const isFeriado = (data: string) => {
    const feriados = [
      '01/01', '21/04', '01/05', '07/09', '12/10', '02/11', '15/11', '25/12'
    ];
    const diaMes = data.split(' ')[0];
    return feriados.includes(diaMes);
  };

  const isFimDeSemana = (diaSemana: string) => {
    return diaSemana === 'DOM' || diaSemana === 'SAB';
  };

  const diasMes = getDiasMes(mesAtual, anoAtual);
  const funcionarios = escala.funcionarios;

  // Estrutura da escala carregada

  if (linkId && linkGerado === 'NOT_FOUND') {
    return (
      <div className="mobile-escala-container">
        <div className="error-container">
          <h1>🔍 Escala Não Encontrada</h1>
          <p>O link que você está tentando acessar não existe ou expirou.</p>
          <p>Entre em contato com o administrador para obter um novo link.</p>
          <button onClick={() => navigate('/')} className="back-button">
            ← Voltar ao Sistema
          </button>
        </div>
      </div>
    );
  }

  // Touch handlers para swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentDayIndex < diasMes.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
    } else if (isRightSwipe && currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleCardClick = (index: number) => {
    setCurrentDayIndex(index);
  };

  const getFuncionariosComHorario = (dia: number) => {
    const funcionariosComHorario = funcionarios
      .map(func => {
        const horario = getHorarioFuncionario(dia, func.id);
        return {
          ...func,
          horario: horario
        };
      })
      .sort((a, b) => {
        // Ordena por horário de início (se tiver horário)
        if (!a.horario && !b.horario) return 0;
        if (!a.horario) return 1;
        if (!b.horario) return -1;
        
        const horaA = parseInt(a.horario.split('H')[0]);
        const horaB = parseInt(b.horario.split('H')[0]);
        return horaA - horaB;
      });
    

    
    return funcionariosComHorario;
  };

  const getDiaAtual = () => {
    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mesHoje = hoje.getMonth() + 1;
    const anoHoje = hoje.getFullYear();
    
    if (mesHoje === mesAtual && anoHoje === anoAtual) {
      return diasMes.findIndex(dia => dia.dia === diaHoje);
    }
    return 0;
  };

  useEffect(() => {
    // Define o dia atual como padrão
    const diaAtualIndex = getDiaAtual();
    if (diaAtualIndex >= 0) {
      setCurrentDayIndex(diaAtualIndex);
    }
  }, [mesAtual, anoAtual]);

  const currentDay = diasMes[currentDayIndex];
  const funcionariosComHorario = getFuncionariosComHorario(currentDay.dia);

  return (
    <div className="mobile-escala-container">
      {copiado && (
        <div className="copy-success">
          ✅ Link copiado com sucesso!
        </div>
      )}
      <div className="mobile-header">
        <div className="mobile-title">
          <h1>📅 Escala Mobile</h1>
          <p>{getNomeMes(mesAtual)} {anoAtual}</p>
          {linkId && (
            <div className="shared-badge">
              🔗 Visualização Compartilhada
            </div>
          )}
        </div>
        <div className="mobile-selectors">
          <select value={mesAtual} onChange={(e) => handleMesChange(Number(e.target.value))} className="mobile-select">
            {meses.map(mes => (
              <option key={mes.valor} value={mes.valor}>{mes.nome}</option>
            ))}
          </select>
          <select value={anoAtual} onChange={(e) => handleAnoChange(Number(e.target.value))} className="mobile-select">
            {anos.map(ano => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </div>
        {!linkId && (
          <button onClick={handleCompartilhar} className="share-button">
            🔗 Gerar Link Compartilhável
          </button>
        )}
        {linkGerado && linkGerado !== 'NOT_FOUND' && (
          <div className="share-link-container">
            <h3 style={{ color: 'white', marginBottom: '15px', textAlign: 'center' }}>
              🔗 Link Compartilhável Gerado
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '15px', textAlign: 'center', fontSize: '0.9em' }}>
              Copie este link e envie para os funcionários para que eles possam visualizar a escala
            </p>
            <input type="text" value={linkGerado} readOnly className="share-link-input" />
            <button onClick={handleCopy} className="copy-link-btn">
              {copiado ? '✅ Copiado!' : '📋 Copiar Link'}
            </button>
          </div>
        )}
      </div>

      {/* Carrossel de Cards */}
      <div className="carousel-container">
        <div className="carousel-track">
          {diasMes.map((dia, index) => {
            const isActive = index === currentDayIndex;
            const isPrev = index === currentDayIndex - 1;
            const isNext = index === currentDayIndex + 1;
            const funcionariosDia = getFuncionariosComHorario(dia.dia);
            
            return (
              <div
                key={dia.dia}
                className={`carousel-card ${isActive ? 'active' : ''} ${isPrev ? 'prev' : ''} ${isNext ? 'next' : ''}`}
                onClick={() => handleCardClick(index)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="card-header">
                  <div className="card-date">
                    <span className="date-number">{dia.dia.toString().padStart(2, '0')}</span>
                    <span className="date-month">/{mesAtual.toString().padStart(2, '0')}</span>
                  </div>
                  <div className="card-day">
                    {dia.nomeDia}
                    {isFeriado(dia.data) && <span className="holiday-badge">🎉</span>}
                  </div>
                </div>

                <div className="card-content">
                  {funcionariosDia.map(func => (
                    <div key={func.id} className={`funcionario-item ${!func.horario ? 'no-horario' : ''} ${func.horario === 'FOLGA' ? 'folga' : ''} ${func.horario === 'FERIADO' ? 'feriado' : ''}`}>
                      <span className="horario">
                        {func.horario || 'Sem horário'}
                      </span>
                      <span className="nome">- {func.nome}</span>
                    </div>
                  ))}
                </div>

                <div className="card-footer">
                  <div className="day-indicator">
                    {index + 1} de {diasMes.length}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navegação */}
      <div className="mobile-navigation">
        <button 
          className="nav-button"
          onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))}
          disabled={currentDayIndex === 0}
        >
          ← Anterior
        </button>
        
        <div className="nav-dots">
          {diasMes.map((_, index) => (
            <button
              key={index}
              className={`nav-dot ${index === currentDayIndex ? 'active' : ''}`}
              onClick={() => setCurrentDayIndex(index)}
            />
          ))}
        </div>
        
        <button 
          className="nav-button"
          onClick={() => setCurrentDayIndex(Math.min(diasMes.length - 1, currentDayIndex + 1))}
          disabled={currentDayIndex === diasMes.length - 1}
        >
          Próximo →
        </button>
      </div>

      {/* Instruções */}
      <div className="mobile-instructions">
        <p>💡 Deslize para navegar entre os dias ou use os botões</p>
        <button 
          onClick={() => window.location.href = '/'} 
          className="back-button"
        >
          ← Voltar ao Sistema
        </button>
      </div>
    </div>
  );
}

export default MobileEscala; 