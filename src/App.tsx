import React, { useState, useEffect } from 'react';
import { EscalaData, Funcionario, DiaEscala } from './types';
import { dadosIniciais } from './data';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { 
  limitarHistorico, 
  limpezaAutomatica, 
  otimizarParaSalvamento,
  verificarTamanhoLocalStorage 
} from './utils/optimization';
import './App.css';

function App() {
  const [escala, setEscala] = useState<EscalaData>(() => {
    const savedEscala = localStorage.getItem('escala-horarios');
    
    // Se não há dados salvos ou se os dados estão vazios, usa dados iniciais
    let parsedEscala;
    if (!savedEscala) {
      parsedEscala = dadosIniciais;
    } else {
      const tempParsed = JSON.parse(savedEscala);
      if (tempParsed.funcionarios.length === 0) {
        // Se os dados salvos estão vazios, limpa e usa dados iniciais
        localStorage.removeItem('escala-horarios');
        parsedEscala = dadosIniciais;
      } else {
        parsedEscala = tempParsed;
      }
    }
    
    return parsedEscala;
  });
  const [mesAtual, setMesAtual] = useState<number>(7);
  const [anoAtual, setAnoAtual] = useState<number>(2024);
  const [isEditing, setIsEditing] = useState(false);
  const [editHistory, setEditHistory] = useState<EscalaData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastRemovalAction, setLastRemovalAction] = useState<{
    type: 'day' | 'funcionario';
    id: number;
    data: any;
  } | null>(null);



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
  };

  const handleAnoChange = (novoAno: number) => {
    setAnoAtual(novoAno);
  };

  const getNomeMes = (mes: number) => {
    return meses.find(m => m.valor === mes)?.nome || '';
  };

  const saveToHistory = (escala: EscalaData) => {
    const newHistory = editHistory.slice(0, historyIndex + 1);
    newHistory.push(escala);
    
    // Limita o histórico para não ficar muito pesado
    const historicoLimitado = limitarHistorico(newHistory);
    setEditHistory(historicoLimitado);
    setHistoryIndex(historicoLimitado.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEscala(editHistory[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < editHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEscala(editHistory[newIndex]);
    }
  };

  const handleCancelEdit = () => {
    if (window.confirm('Tem certeza que deseja cancelar as edições? Todas as mudanças serão perdidas.')) {
      // Restaura o estado original
      if (editHistory.length > 0) {
        setEscala(editHistory[0]);
        setHistoryIndex(0);
      }
      setIsEditing(false);
    }
  };

  const handleUndoLastRemoval = () => {
    if (!lastRemovalAction) return;
    
    if (lastRemovalAction.type === 'day') {
      // Restaura o dia removido
      setEscala(prevEscala => ({
        ...prevEscala,
        dias: [...prevEscala.dias, lastRemovalAction.data].sort((a, b) => a.dia - b.dia)
      }));
    } else if (lastRemovalAction.type === 'funcionario') {
      // Restaura o funcionário removido
      setFuncionarios(prevFuncionarios => [...prevFuncionarios, lastRemovalAction.data]);
      
      // Restaura os horários do funcionário (vazios)
      setEscala(prevEscala => ({
        ...prevEscala,
        dias: prevEscala.dias.map(dia => ({
          ...dia,
          horarios: [...dia.horarios, { funcionarioId: lastRemovalAction.id, horario: "FOLGA" }]
        }))
      }));
    }
    
    // Remove o botão de desfazer
    setLastRemovalAction(null);
  };

  // Salvar escala no localStorage sempre que ela mudar
  useEffect(() => {
    // Otimiza os dados antes de salvar
    const escalaOtimizada = otimizarParaSalvamento(escala);
    localStorage.setItem('escala-horarios', JSON.stringify(escalaOtimizada));
    
    // Verifica e faz limpeza automática se necessário
    limpezaAutomatica();
  }, [escala]);

  // Salvar estado inicial quando entrar no modo de edição
  useEffect(() => {
    if (isEditing && editHistory.length === 0) {
      setEditHistory([escala]);
      setHistoryIndex(0);
    }
  }, [isEditing]);

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([
    { id: 1, nome: "FILIPE", cor: "#4CAF50" },
    { id: 2, nome: "ARMANDO", cor: "#2196F3" },
    { id: 3, nome: "DAYANE", cor: "#FF9800" },
    { id: 4, nome: "JOAO P", cor: "#9C27B0" }
  ]);

  const turnos = [
    "", // Opção vazia
    "10H AS 16H",
    "10H AS 19H", 
    "10H AS 20H",
    "12H AS 19H",
    "13H AS 19H",
    "13H AS 20H",
    "13H AS 21H",
    "13H AS 22H",
    "16H AS 22H",
    "FOLGA",
    "FERIADO"
  ];

  const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

  // Lista de feriados brasileiros (dia/mês)
  const feriados = [
    "01/01", // Ano Novo
    "21/04", // Tiradentes
    "01/05", // Dia do Trabalho
    "07/09", // Independência do Brasil
    "12/10", // Nossa Senhora Aparecida
    "02/11", // Finados
    "15/11", // Proclamação da República
    "25/12"  // Natal
  ];

  // Feriados móveis (Páscoa, Carnaval, etc.) - aproximação
  const getFeriadosMoveis = (ano: number) => {
    const feriadosMoveis = [];
    
    // Carnaval (47 dias antes da Páscoa)
    const pascoa = new Date(ano, 2, 21); // Aproximação da Páscoa
    const carnaval = new Date(pascoa.getTime() - (47 * 24 * 60 * 60 * 1000));
    feriadosMoveis.push(`${carnaval.getDate().toString().padStart(2, '0')}/${(carnaval.getMonth() + 1).toString().padStart(2, '0')}`);
    
    // Sexta-feira Santa (2 dias antes da Páscoa)
    const sextaSanta = new Date(pascoa.getTime() - (2 * 24 * 60 * 60 * 1000));
    feriadosMoveis.push(`${sextaSanta.getDate().toString().padStart(2, '0')}/${(sextaSanta.getMonth() + 1).toString().padStart(2, '0')}`);
    
    // Páscoa
    feriadosMoveis.push(`${pascoa.getDate().toString().padStart(2, '0')}/${(pascoa.getMonth() + 1).toString().padStart(2, '0')}`);
    
    // Corpus Christi (60 dias após a Páscoa)
    const corpusChristi = new Date(pascoa.getTime() + (60 * 24 * 60 * 60 * 1000));
    feriadosMoveis.push(`${corpusChristi.getDate().toString().padStart(2, '0')}/${(corpusChristi.getMonth() + 1).toString().padStart(2, '0')}`);
    
    return feriadosMoveis;
  };

  const isFeriado = (data: string) => {
    const diaMes = data.split(' ')[0]; // Pega apenas "DD/MM"
    const todosFeriados = [...feriados, ...getFeriadosMoveis(anoAtual)];
    return todosFeriados.includes(diaMes);
  };

  const isFimDeSemana = (diaSemana: string) => {
    return diaSemana === 'DOM' || diaSemana === 'SAB';
  };

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



  const getHorarioFuncionario = (dia: number, funcionarioId: number) => {
    const diaEscala = escala.dias.find(d => d.dia === dia);
    if (!diaEscala) return "";
    
    const horario = diaEscala.horarios.find(h => h.funcionarioId === funcionarioId);
    return horario ? horario.horario : "";
  };

  const handleHorarioChange = (dia: number, funcionarioId: number, novoHorario: string) => {
    setEscala(prevEscala => {
      const novaEscala = { ...prevEscala };
      const diaIndex = novaEscala.dias.findIndex(d => d.dia === dia);

      if (diaIndex !== -1) {
        const horarioIndex = novaEscala.dias[diaIndex].horarios.findIndex(h => h.funcionarioId === funcionarioId);
        if (horarioIndex !== -1) {
          novaEscala.dias[diaIndex].horarios[horarioIndex].horario = novoHorario;
        } else {
          novaEscala.dias[diaIndex].horarios.push({ funcionarioId, horario: novoHorario });
        }
      } else {
        novaEscala.dias.push({
          dia,
          horarios: [{ funcionarioId, horario: novoHorario }]
        });
      }
      saveToHistory(novaEscala); // Salva o estado atualizado no histórico
      return novaEscala;
    });
  };

  const handleAddDay = () => {
    const lastDay = escala.dias.length > 0 ? Math.max(...escala.dias.map(d => d.dia)) : 0;
    const newDayNumber = lastDay + 1;
    const newDate = new Date(anoAtual, mesAtual - 1, newDayNumber);
    const newDayOfWeek = diasSemana[newDate.getDay()];

    const newHorarios = funcionarios.map(func => ({
      funcionarioId: func.id,
      horario: "FOLGA" // Horário padrão para o novo dia
    }));

    const newDiaEscala = {
      dia: newDayNumber,
      horarios: newHorarios
    };

    setEscala(prevEscala => ({
      ...prevEscala,
      dias: [...prevEscala.dias, newDiaEscala]
    }));
  };

  const handleRemoveDay = (diaToRemove: number) => {
    // Salva os dados do dia antes de remover
    const diaToRemoveData = escala.dias.find(d => d.dia === diaToRemove);
    
    setEscala(prevEscala => ({
      ...prevEscala,
      dias: prevEscala.dias.filter(dia => dia.dia !== diaToRemove)
    }));
    
    // Mostra o botão de desfazer
    setLastRemovalAction({
      type: 'day',
      id: diaToRemove,
      data: diaToRemoveData
    });
    
    // Remove o botão de desfazer após 5 segundos
    setTimeout(() => {
      setLastRemovalAction(null);
    }, 5000);
  };

  const handleAddFuncionario = () => {
    const newFuncionarioId = funcionarios.length > 0 ? Math.max(...funcionarios.map(f => f.id)) + 1 : 1;
    const newFuncionarioName = `NOVO FUNC ${newFuncionarioId}`;
    const newFuncionario: Funcionario = { id: newFuncionarioId, nome: newFuncionarioName, cor: "#CCCCCC" };

    setFuncionarios(prevFuncionarios => [...prevFuncionarios, newFuncionario]);

    // Adicionar horários padrão para o novo funcionário em todos os dias existentes
    setEscala(prevEscala => ({
      ...prevEscala,
      dias: prevEscala.dias.map(dia => ({
        ...dia,
        horarios: [...dia.horarios, { funcionarioId: newFuncionario.id, horario: "FOLGA" }]
      }))
    }));
  };

  const handleRemoveFuncionario = (funcionarioIdToRemove: number) => {
    // Salva os dados do funcionário antes de remover
    const funcionarioToRemove = funcionarios.find(f => f.id === funcionarioIdToRemove);
    
    setFuncionarios(prevFuncionarios => prevFuncionarios.filter(func => func.id !== funcionarioIdToRemove));

    // Remover horários do funcionário removido de todos os dias
    setEscala(prevEscala => ({
      ...prevEscala,
      dias: prevEscala.dias.map(dia => ({
        ...dia,
        horarios: dia.horarios.filter(h => h.funcionarioId !== funcionarioIdToRemove)
      }))
    }));
    
    // Mostra o botão de desfazer
    setLastRemovalAction({
      type: 'funcionario',
      id: funcionarioIdToRemove,
      data: funcionarioToRemove
    });
    
    // Remove o botão de desfazer após 5 segundos
    setTimeout(() => {
      setLastRemovalAction(null);
    }, 5000);
  };

  const handleEditFuncionarioName = (funcionarioId: number) => {
    const funcionario = funcionarios.find(f => f.id === funcionarioId);
    if (!funcionario) return;
    
    const novoNome = prompt(`Digite o novo nome para ${funcionario.nome}:`, funcionario.nome);
    
    if (novoNome && novoNome.trim() !== '' && novoNome !== funcionario.nome) {
      setFuncionarios(prevFuncionarios => 
        prevFuncionarios.map(func => 
          func.id === funcionarioId 
            ? { ...func, nome: novoNome.trim() }
            : func
        )
      );
    }
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

  const handleZerarEscala = () => {
    if (window.confirm('Tem certeza que deseja zerar toda a escala? Esta ação não pode ser desfeita.')) {
      // Limpa completamente a escala
      const escalaLimpa = { funcionarios: escala.funcionarios, dias: [] };
      setEscala(escalaLimpa);
      
      // Limpa o histórico de edição se estiver no modo de edição
      if (isEditing) {
        setEditHistory([escalaLimpa]);
        setHistoryIndex(0);
        setLastRemovalAction(null);
      }
      
      // Limpa o localStorage
      localStorage.setItem('escala-horarios', JSON.stringify(escalaLimpa));
    }
  };

  const handleRestaurarEscala = () => {
    const savedEscala = localStorage.getItem('escala-horarios-backup');
    if (savedEscala) {
      if (window.confirm('Deseja restaurar a escala anterior?')) {
        setEscala(JSON.parse(savedEscala));
      }
    } else {
      alert('Não há backup disponível para restaurar.');
    }
  };

  const handleBackupEscala = () => {
    const escalaOtimizada = otimizarParaSalvamento(escala);
    localStorage.setItem('escala-horarios-backup', JSON.stringify(escalaOtimizada));
    alert('Backup da escala atual salvo com sucesso!');
  };

  const handleVerificarUso = () => {
    const { tamanho, limite } = verificarTamanhoLocalStorage();
    const percentual = ((tamanho / limite) * 100).toFixed(1);
    
    alert(`📊 Informações de Uso:\n\n` +
          `Espaço usado: ${(tamanho / 1024 / 1024).toFixed(2)} MB\n` +
          `Limite: ${(limite / 1024 / 1024).toFixed(2)} MB\n` +
          `Percentual: ${percentual}%\n\n` +
          `Funcionários: ${funcionarios.length}\n` +
          `Dias com dados: ${escala.dias.length}\n` +
          `Histórico: ${editHistory.length} entradas`);
  };

  const handleExportPdf = () => {
    // Cria o PDF em modo paisagem (A4) com unidades em milímetros
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Dimensões da página A4 paisagem
    const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
    const margin = 8; // margem externa reduzida para 8mm

    // Área útil da página
    const usableWidth = pageWidth - (margin * 2);
    const usableHeight = pageHeight - (margin * 2);

    // Configurações de fonte
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12); // Fonte do título reduzida de 14 para 12

    // Título principal (menor e mais compacto)
    const title = `ESCALA - ${getNomeMes(mesAtual).toUpperCase()} ${anoAtual}`;
    const titleWidth = pdf.getTextWidth(title);
    const titleX = (pageWidth - titleWidth) / 2;
    pdf.text(title, titleX, margin + 6); // Espaçamento reduzido de 8 para 6

    // Configurações da tabela otimizadas para melhor uso do espaço
    pdf.setFontSize(9); // Fonte maior para melhor visibilidade
    const tableStartY = margin + 10; // Espaçamento reduzido de 12 para 10
    const rowHeight = 5.5; // Altura otimizada para caber 31 dias mantendo boa visibilidade
    const colWidth = usableWidth / (funcionarios.length + 1); // +1 para a coluna de data

    // Cabeçalho da tabela
    pdf.setFillColor(52, 73, 94); // Cor azul escura
    pdf.rect(margin, tableStartY, usableWidth, rowHeight, 'F');
    
    // Texto do cabeçalho
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10); // Fonte maior para cabeçalhos
    
    // Cabeçalho da coluna DATA - centralizado
    const dataHeaderText = 'DATA';
    const dataHeaderWidth = pdf.getTextWidth(dataHeaderText);
    const dataHeaderX = margin + (colWidth - dataHeaderWidth) / 2;
    pdf.text(dataHeaderText, dataHeaderX, tableStartY + (rowHeight / 2) + 1);
    
    // Cabeçalhos dos funcionários - centralizados
    funcionarios.forEach((func, index) => {
      const cellX = margin + colWidth * (index + 1);
      const textWidth = pdf.getTextWidth(func.nome);
      const textX = cellX + (colWidth - textWidth) / 2;
      pdf.text(func.nome, textX, tableStartY + (rowHeight / 2) + 1);
    });

    // Dados da tabela
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold'); // Texto em negrito para melhor visibilidade
    pdf.setFontSize(9);
    
    diasMes.forEach(({ dia, diaSemana, data }, rowIndex) => {
      const y = tableStartY + rowHeight + (rowIndex * rowHeight);
      
      // Verifica se precisa de nova página
      if (y + rowHeight > pageHeight - margin) {
        pdf.addPage();
        // Repete o cabeçalho na nova página
        pdf.setFillColor(52, 73, 94);
        pdf.rect(margin, margin, usableWidth, rowHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        
        // Cabeçalho da coluna DATA na nova página - centralizado
        const dataHeaderWidth = pdf.getTextWidth('DATA');
        const dataHeaderX = margin + (colWidth - dataHeaderWidth) / 2;
        pdf.text('DATA', dataHeaderX, margin + (rowHeight / 2) + 1);
        
        // Cabeçalhos dos funcionários na nova página - centralizados
        funcionarios.forEach((func, index) => {
          const cellX = margin + colWidth * (index + 1);
          const textWidth = pdf.getTextWidth(func.nome);
          const textX = cellX + (colWidth - textWidth) / 2;
          pdf.text(func.nome, textX, margin + (rowHeight / 2) + 1);
        });
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
      }

      // Cor de fundo para fins de semana
      if (isFimDeSemana(diaSemana)) {
        pdf.setFillColor(248, 249, 250);
        pdf.rect(margin, y, usableWidth, rowHeight, 'F');
      }

      // Coluna de data - centralizada
      const dataText = `${data} (${diaSemana})`;
      const dataTextWidth = pdf.getTextWidth(dataText);
      const dataTextX = margin + (colWidth - dataTextWidth) / 2;
      pdf.text(dataText, dataTextX, y + (rowHeight / 2) + 1);

      // Dados dos funcionários - centralizados
      funcionarios.forEach((func, colIndex) => {
        const cellX = margin + colWidth * (colIndex + 1);
        const horario = getHorarioFuncionario(dia, func.id);
        
        // Cor de fundo para folgas e feriados
        if (horario === 'FOLGA') {
          pdf.setFillColor(255, 234, 167);
          pdf.rect(cellX, y, colWidth, rowHeight, 'F');
          pdf.setFont('helvetica', 'bold');
        } else if (horario === 'FERIADO' || isFeriado(data)) {
          pdf.setFillColor(255, 235, 238);
          pdf.rect(cellX, y, colWidth, rowHeight, 'F');
          pdf.setTextColor(211, 47, 47);
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'bold'); // Mantém negrito para todos os textos
          pdf.setTextColor(0, 0, 0);
        }

        // Mostra "FERIADO" automaticamente se for feriado nacional
        const displayText = isFeriado(data) ? 'FERIADO' : (horario || '');
        const textWidth = pdf.getTextWidth(displayText);
        const textX = cellX + (colWidth - textWidth) / 2;
        pdf.text(displayText, textX, y + (rowHeight / 2) + 1);
      });
    });

    // Bordas da tabela
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    
    // Linhas horizontais
    for (let i = 0; i <= diasMes.length + 1; i++) {
      const y = tableStartY + (i * rowHeight);
      pdf.line(margin, y, margin + usableWidth, y);
    }
    
    // Linhas verticais
    for (let i = 0; i <= funcionarios.length + 1; i++) {
      const x = margin + (i * colWidth);
      pdf.line(x, tableStartY, x, tableStartY + (diasMes.length + 1) * rowHeight);
    }

    // Salva o PDF
    const nomeArquivo = `escala-${getNomeMes(mesAtual).toLowerCase()}-${anoAtual}.pdf`;
    pdf.save(nomeArquivo);
  };

  const handleExportExcel = () => {
    // Cria a planilha com os dados da escala
    const workbook = XLSX.utils.book_new();
    
    // Prepara os dados para o Excel
    const dados = [];
    
    // Cabeçalho
    const header = ['DATA', ...funcionarios.map(f => f.nome)];
    dados.push(header);
    
    // Dados dos dias
    diasMes.forEach(({ dia, diaSemana, data }) => {
      const row = [data + ' (' + diaSemana + ')'];
      
      funcionarios.forEach(func => {
        const horario = getHorarioFuncionario(dia, func.id);
        row.push(horario);
      });
      
      dados.push(row);
    });
    
    // Cria a planilha
    const worksheet = XLSX.utils.aoa_to_sheet(dados);
    
    // Ajusta a largura das colunas
    const colWidths = [
      { wch: 15 }, // DATA
      ...funcionarios.map(() => ({ wch: 12 })) // Funcionários
    ];
    worksheet['!cols'] = colWidths;
    
    // Remove caracteres inválidos do nome da planilha
    const nomePlanilha = `Escala ${getNomeMes(mesAtual)} ${anoAtual}`.replace(/[:\\/?*[\]]/g, '');
    XLSX.utils.book_append_sheet(workbook, worksheet, nomePlanilha);
    
    // Remove caracteres inválidos do nome do arquivo
    const nomeArquivo = `escala-${getNomeMes(mesAtual).toLowerCase()}-${anoAtual}.xlsx`.replace(/[:\\/?*[\]]/g, '');
    XLSX.writeFile(workbook, nomeArquivo);
  };



  const stats = calcularEstatisticas();
  const diasMes = getDiasMes(mesAtual, anoAtual);
  
  // Calcula uso do localStorage
  const { tamanho, limite } = verificarTamanhoLocalStorage();
  const percentualUso = (tamanho / limite) * 100;

  return (
    <div className="container">
      {/* Botão flutuante de desfazer */}
      {lastRemovalAction && (
        <div className="floating-undo">
          <button 
            onClick={handleUndoLastRemoval}
            className="floating-undo-button"
            title={`Desfazer remoção de ${lastRemovalAction.type === 'day' ? 'dia' : 'funcionário'}`}
          >
            ↩️ Desfazer
          </button>
        </div>
      )}
      
      {/* Botões flutuantes de compartilhamento */}
      <div className="floating-share">
        <button 
          onClick={() => {
            const message = `📅 *ESCALA DE HORÁRIOS - ${getNomeMes(mesAtual).toUpperCase()} ${anoAtual}*\n\nOlá! Aqui está o link da escala de horários:\n\n🔗 ${window.location.href}\n\n📋 *Funcionários:* ${funcionarios.map(f => f.nome).join(', ')}\n📅 *Período:* ${getNomeMes(mesAtual)} ${anoAtual}\n\nAcesse o link para ver seus horários e folgas! 👆`;
            
            // Detecta se é mobile ou desktop
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
              // Mobile: abre WhatsApp app
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
              window.open(whatsappUrl, '_blank');
            } else {
              // Desktop: abre WhatsApp Web
              const whatsappWebUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
              window.open(whatsappWebUrl, '_blank');
            }
          }}
          className="floating-whatsapp-button"
          title="Compartilhar escala via WhatsApp"
        >
          📱 WhatsApp
        </button>
        
        <button 
          onClick={() => {
            navigator.clipboard.writeText(window.location.href).then(() => {
              alert('Link copiado para a área de transferência!');
            }).catch(() => {
              // Fallback para navegadores mais antigos
              const textArea = document.createElement('textarea');
              textArea.value = window.location.href;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              alert('Link copiado para a área de transferência!');
            });
          }}
          className="floating-copy-button"
          title="Copiar link da escala"
        >
          📋 Copiar Link
        </button>
      </div>
      
      <div className="header">
        <h1>📅 Escala de Horários</h1>
        <p>{getNomeMes(mesAtual)} {anoAtual} - Sistema de Gestão de Turnos</p>
        
        <div className="month-year-selector">
          <div className="selector-group">
            <label htmlFor="mes-select">Mês:</label>
            <select 
              id="mes-select"
              value={mesAtual} 
              onChange={(e) => handleMesChange(Number(e.target.value))}
              className="month-select"
            >
              {meses.map(mes => (
                <option key={mes.valor} value={mes.valor}>
                  {mes.nome}
                </option>
              ))}
            </select>
          </div>
          
          <div className="selector-group">
            <label htmlFor="ano-select">Ano:</label>
            <select 
              id="ano-select"
              value={anoAtual} 
              onChange={(e) => handleAnoChange(Number(e.target.value))}
              className="year-select"
            >
              {anos.map(ano => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Salvar' : 'Editar'}
        </button>
        {isEditing && (
          <button onClick={handleAddFuncionario} className="add-funcionario-button">
            Adicionar Funcionário
          </button>
        )}
        <button onClick={handleExportPdf} className="export-pdf-button">
          Exportar para PDF
        </button>
        <button onClick={handleExportExcel} className="export-excel-button">
          Exportar para Excel
        </button>
        <button onClick={handleBackupEscala} className="backup-button">
          Fazer Backup
        </button>
        <button onClick={handleZerarEscala} className="zerar-button">
          Zerar Escala
        </button>
        <button onClick={handleRestaurarEscala} className="restaurar-button">
          Restaurar Backup
        </button>
        <button onClick={handleVerificarUso} style={{ backgroundColor: '#17a2b8' }}>
          📊 Verificar Uso
        </button>
        <button onClick={() => window.location.href = '/parcial'} style={{ backgroundColor: '#6f42c1' }}>
          📅 Escala Parcial
        </button>
        <button onClick={() => window.location.href = '/mobile'} style={{ backgroundColor: '#17a2b8' }}>
          📱 Visualização Mobile
        </button>
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
        <div className="stat-card" style={{ 
          backgroundColor: percentualUso > 80 ? '#ffebee' : 
                          percentualUso > 60 ? '#fff3e0' : '#f1f8e9'
        }}>
          <div className="stat-number" style={{ 
            color: percentualUso > 80 ? '#d32f2f' : 
                   percentualUso > 60 ? '#f57c00' : '#388e3c'
          }}>
            {percentualUso.toFixed(1)}%
          </div>
          <div className="stat-label">Uso LocalStorage</div>
        </div>
      </div>

      <div className="escala-table">
        <div className="table-header">
          <h2>Escala Mensal - {getNomeMes(mesAtual)} {anoAtual}</h2>
        </div>
        
        <div className="table-container" id="escala-table-container">
          <table>
            <thead>
              <tr>
                <th className="data-cell">DATA</th>
                {funcionarios.map(func => (
                  <th key={func.id} className="funcionario-header">
                    {func.nome}
                    {isEditing && (
                      <div className="funcionario-actions">
                        <button 
                          onClick={() => handleEditFuncionarioName(func.id)} 
                          className="edit-funcionario-button"
                          title="Editar nome"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleRemoveFuncionario(func.id)} 
                          className="remove-funcionario-button"
                          title="Remover funcionário"
                        >
                          ❌
                        </button>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diasMes.map(({ dia, diaSemana, data }) => (
                <tr key={dia} className={isFimDeSemana(diaSemana) ? 'fim-de-semana' : ''}>
                  <td className="data-cell">
                    <div className="date-content">
                      {data} ({diaSemana})
                      {isFeriado(data) && (
                        <span className="holiday-icon" title="Feriado Nacional">
                          🎉
                        </span>
                      )}
                    </div>
                  </td>
                  {funcionarios.map(func => {
                    const horario = getHorarioFuncionario(dia, func.id);
                    return (
                      <td 
                        key={func.id} 
                        className={`horario-cell ${horario === "FOLGA" ? 'folga' : ''} ${horario === "FERIADO" ? 'feriado' : ''}`}
                      >
                        {isEditing ? (
                          <select 
                            value={horario || ""} 
                            onChange={(e) => handleHorarioChange(dia, func.id, e.target.value)}
                          >
                            {turnos.map(t => (
                              <option key={t} value={t}>
                                {t || "Selecione..."}
                              </option>
                            ))}
                          </select>
                        ) : (
                          horario || ""
                        )}
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