import React, { useState, useEffect } from 'react';
import { EscalaData, Funcionario, DiaEscala } from './types';
import { dadosIniciais } from './data';
import './App.css';

function App() {
  const [escala, setEscala] = useState<EscalaData>(dadosIniciais);
  const [mesAtual, setMesAtual] = useState<number>(7);
  const [anoAtual, setAnoAtual] = useState<number>(2024);

  const funcionarios = [
    { id: 1, nome: "FILIPE", cor: "#4CAF50" },
    { id: 2, nome: "ARMANDO", cor: "#2196F3" },
    { id: 3, nome: "DAYANE", cor: "#FF9800" },
    { id: 4, nome: "JOAO P", cor: "#9C27B0" }
  ];

  const turnos = [
    "10H AS 16H",
    "10H AS 19H", 
    "10H AS 20H",
    "12H AS 19H",
    "13H AS 19H",
    "13H AS 20H",
    "13H AS 21H",
    "13H AS 22H",
    "16H AS 22H",
    "FOLGA"
  ];

  const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

  const getDiasMes = (mes: number, ano: number) => {
    const dias = new Date(ano, mes, 0).getDate();
    const diasArray = [];
    
    for (let i = 1; i <= dias; i++) {
      const data = new Date(ano, mes - 1, i);
      const diaSemana = diasSemana[data.getDay()];
      diasArray.push({
        dia: i,
        diaSemana,
        data: `${i.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}`
      });
    }
    
    return diasArray;
  };

  const temFolga = (dia: number) => {
    return escala.dias.some(d => d.dia === dia && d.horarios.some(h => h.horario === "FOLGA"));
  };

  const getHorarioFuncionario = (dia: number, funcionarioId: number) => {
    const diaEscala = escala.dias.find(d => d.dia === dia);
    if (!diaEscala) return "";
    
    const horario = diaEscala.horarios.find(h => h.funcionarioId === funcionarioId);
    return horario ? horario.horario : "";
  };

  const calcularEstatisticas = () => {
    const stats = {
      totalDias: escala.dias.length,
      totalFolgas: 0,
      totalHorarios: 0,
      funcionariosComFolga: 0
    };

    escala.dias.forEach(dia => {
      const folgasDia = dia.horarios.filter(h => h.horario === "FOLGA").length;
      stats.totalFolgas += folgasDia;
      stats.totalHorarios += dia.horarios.length;
      if (folgasDia > 0) stats.funcionariosComFolga++;
    });

    return stats;
  };

  const stats = calcularEstatisticas();
  const diasMes = getDiasMes(mesAtual, anoAtual);

  return (
    <div className="container">
      <div className="header">
        <h1>📅 Escala de Horários</h1>
        <p>Julho 2024 - Sistema de Gestão de Turnos</p>
      </div>

      <div className="stats">
        <div className="stat-card">
          <div className="stat-number">{stats.totalDias}</div>
          <div className="stat-label">Dias no Mês</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalFolgas}</div>
          <div className="stat-label">Total de Folgas</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{funcionarios.length}</div>
          <div className="stat-label">Funcionários</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.funcionariosComFolga}</div>
          <div className="stat-label">Dias com Folga</div>
        </div>
      </div>

      <div className="escala-table">
        <div className="table-header">
          <h2>Escala Mensal - Julho 2024</h2>
        </div>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th className="data-cell">DATA</th>
                {funcionarios.map(func => (
                  <th key={func.id} className="funcionario-header">
                    {func.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diasMes.map(({ dia, diaSemana, data }) => (
                <tr key={dia} className={temFolga(dia) ? 'folga-row' : ''}>
                  <td className="data-cell">
                    {data} ({diaSemana})
                  </td>
                  {funcionarios.map(func => {
                    const horario = getHorarioFuncionario(dia, func.id);
                    return (
                      <td 
                        key={func.id} 
                        className={`horario-cell ${horario === "FOLGA" ? 'folga' : ''}`}
                      >
                        {horario}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App; 