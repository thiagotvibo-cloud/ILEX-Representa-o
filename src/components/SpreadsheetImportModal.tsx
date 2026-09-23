import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  Users,
  Package,
  Factory,
  Contact,
  ArrowRight,
} from 'lucide-react';
import { useCRM } from '../lib/store';

export type ImportTargetType = 'contacts' | 'products' | 'manufacturers';

interface SpreadsheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTarget?: ImportTargetType;
}

export const SpreadsheetImportModal: React.FC<SpreadsheetImportModalProps> = ({
  isOpen,
  onClose,
  defaultTarget = 'contacts',
}) => {
  const { importSpreadsheetData } = useCRM();

  const [target, setTarget] = useState<ImportTargetType>(defaultTarget === 'customers' as any ? 'contacts' : defaultTarget);
  const [contactSubtype, setContactSubtype] = useState<'person' | 'factory'>('person');
  const [file, setFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Custom parser for delimited text (semicolon, comma, tab)
  const parseDelimitedCSV = (text: string): any[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    // Detect delimiter from header line
    const firstLine = lines[0];
    let delimiter = ';';
    if ((firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length && (firstLine.match(/;/g) || []).length > 0) {
      delimiter = ';';
    } else if ((firstLine.match(/\t/g) || []).length > 0) {
      delimiter = '\t';
    } else {
      delimiter = ',';
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      let quoteChar = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if ((char === '"' || char === "'") && (!inQuotes || char === quoteChar)) {
          inQuotes = !inQuotes;
          quoteChar = inQuotes ? char : '';
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.replace(/^['"]|['"]$/g, '').trim());
    const dataRows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.every(v => !v)) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = (values[idx] || '').replace(/^['"]|['"]$/g, '').trim();
      });
      dataRows.push(row);
    }
    return dataRows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    processFile(dropped);
  };

  const processFile = (fileToRead: File) => {
    setFile(fileToRead);
    setResultMessage(null);
    setErrorMessage(null);

    const isCsv = fileToRead.name.toLowerCase().endsWith('.csv');

    if (isCsv) {
      const textReader = new FileReader();
      textReader.onload = (evt) => {
        try {
          const rawText = evt.target?.result as string;
          const json = parseDelimitedCSV(rawText);
          if (!json || json.length === 0) {
            setErrorMessage('O arquivo CSV selecionado está vazio ou sem linhas legíveis.');
            setParsedRows([]);
            setPreviewColumns([]);
            return;
          }
          const cols = Object.keys(json[0] || {});
          setPreviewColumns(cols);
          setParsedRows(json);
        } catch (err: any) {
          setErrorMessage(`Erro ao ler CSV: ${err?.message || 'Formato inválido'}`);
        }
      };
      textReader.readAsText(fileToRead, 'ISO-8859-1');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!json || json.length === 0) {
          setErrorMessage('A planilha selecionada está vazia ou sem linhas legíveis.');
          setParsedRows([]);
          setPreviewColumns([]);
          return;
        }

        const cols = Object.keys(json[0] || {});
        setPreviewColumns(cols);
        setParsedRows(json);

        const colsJoined = cols.join(' ').toLowerCase();
        if (colsJoined.includes('sku') || colsJoined.includes('preco') || colsJoined.includes('preço')) {
          setTarget('products');
        } else if (colsJoined.includes('comissao') || colsJoined.includes('comissão') || colsJoined.includes('representada')) {
          setTarget('manufacturers');
        }
      } catch (err: any) {
        setErrorMessage(`Erro ao ler arquivo da planilha: ${err?.message || 'Formato inválido'}`);
      }
    };
    reader.readAsBinaryString(fileToRead);
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setErrorMessage('Cole o texto da planilha na caixa antes de processar.');
      return;
    }
    setResultMessage(null);
    setErrorMessage(null);
    try {
      const rows = parseDelimitedCSV(pastedText);
      if (rows.length === 0) {
        setErrorMessage('Não foi possível identificar colunas válidas no texto colado.');
        setParsedRows([]);
        setPreviewColumns([]);
        return;
      }
      const cols = Object.keys(rows[0] || {});
      setPreviewColumns(cols);
      setParsedRows(rows);
      setResultMessage(`${rows.length} registros identificados no texto colado.`);
    } catch (err: any) {
      setErrorMessage(`Erro ao analisar texto colado: ${err?.message}`);
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      setErrorMessage('Nenhum registro para importar. Carregue uma planilha primeiro.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const enhancedRows = parsedRows.map((r) => ({
        ...r,
        Tipo: r['Tipo'] || r['tipo'] || (contactSubtype === 'factory' ? 'Fábrica' : 'Pessoa'),
      }));

      const res = await importSpreadsheetData(target, enhancedRows);
      if (res.errors && res.errors.length > 0) {
        setErrorMessage(res.errors.join(' '));
      } else {
        setResultMessage(`Sucesso! ${res.imported} registro(s) importados e cadastrados no banco de dados.`);
        setParsedRows([]);
        setFile(null);
        setPastedText('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao processar importação.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download template example for the selected category
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    let sampleData: any[] = [];
    let fileName = 'modelo.xlsx';

    if (target === 'contacts') {
      fileName = 'modelo_ilex_contatos_prospeccao.xlsx';
      sampleData = [
        {
          'Nome': 'Carlos Alberto Mendes (Redemac)',
          'Nome Fantasia': 'Redemac Materiais',
          'Tipo': 'Pessoa', // Pessoa ou Fábrica
          'Comprador': 'Carlos Alberto Mendes',
          'CPF': '045.123.789-01',
          'CNPJ': '',
          'Email': 'compras@redemac.com.br',
          'Telefone': '(42) 99874-1234',
          'Cidade': 'Ponta Grossa',
          'UF': 'PR',
          'Segmento': 'Rede Varejo Elétrico',
        },
        {
          'Nome': 'Indústria Metalúrgica Alvorada Ltda',
          'Nome Fantasia': 'Metalúrgica Alvorada',
          'Tipo': 'Fábrica', // Fábrica / Indústria
          'Comprador': 'Eng. Ricardo Silveira',
          'CPF': '',
          'CNPJ': '12.345.678/0001-90',
          'Email': 'comercial@alvoradametal.ind.br',
          'Telefone': '(41) 3345-8890',
          'Cidade': 'Curitiba',
          'UF': 'PR',
          'Segmento': 'Indústria Metalúrgica e Eletroferragens',
        },
      ];
    } else if (target === 'products') {
      fileName = 'modelo_ilex_produtos.xlsx';
      sampleData = [
        {
          'SKU': 'TRF-CAB-25MM',
          'Nome': 'Cabo Flexível 2,5mm² 750V (Rolo 100m)',
          'Fabrica': 'Torralf',
          'Categoria': 'Cabos & Condutores',
          'Unidade': 'RL',
          'Preco': 189.50,
          'Comissao': 5.0,
          'NCM': '8544.49.00',
        },
        {
          'SKU': 'BTL-ISO-TRIF',
          'Nome': 'Isolador Polimérico Trifásico 15kV',
          'Fabrica': 'Betel',
          'Categoria': 'Isoladores',
          'Unidade': 'UN',
          'Preco': 145.00,
          'Comissao': 5.0,
          'NCM': '8546.90.00',
        },
      ];
    } else {
      fileName = 'modelo_ilex_fabricas.xlsx';
      sampleData = [
        {
          'Nome': 'Torralf Condutores Elétricos Ltda',
          'Nome Fantasia': 'Torralf',
          'Codigo': 'TRF',
          'CNPJ': '01.234.567/0001-89',
          'Comissao': 5.0,
        },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-[#E5E9E5] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E5E9E5] bg-[#F7F8F6]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#355C4D] text-white">
              <FileSpreadsheet size={20} className="text-[#B69A67]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#26332D]">
                Importação Inteligente de Planilhas
              </h2>
              <p className="text-xs text-stone-500">
                Envie planilhas em Excel (.xlsx, .xls) ou CSV para cadastrar no banco de dados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#26332D]">
          {/* Target Selector */}
          <div>
            <label className="block font-semibold mb-2 text-stone-700">
              O que você deseja cadastrar com esta planilha?
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTarget('contacts')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  target === 'contacts'
                    ? 'border-[#355C4D] bg-[#355C4D]/10 text-[#355C4D] font-bold shadow-xs'
                    : 'border-[#E5E9E5] bg-white hover:bg-stone-50 text-stone-600'
                }`}
              >
                <Contact size={18} className={target === 'contacts' ? 'text-[#355C4D]' : 'text-stone-400'} />
                <span className="font-bold">Contatos & Prospecção</span>
                <span className="text-[10px] text-stone-400 font-normal">Leads, Compradores e Fábricas</span>
              </button>

              <button
                type="button"
                onClick={() => setTarget('products')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  target === 'products'
                    ? 'border-[#355C4D] bg-[#355C4D]/10 text-[#355C4D] font-bold shadow-xs'
                    : 'border-[#E5E9E5] bg-white hover:bg-stone-50 text-stone-600'
                }`}
              >
                <Package size={18} className={target === 'products' ? 'text-[#355C4D]' : 'text-stone-400'} />
                <span className="font-bold">Produtos</span>
                <span className="text-[10px] text-stone-400 font-normal">Catálogo & Lista de Preços</span>
              </button>

              <button
                type="button"
                onClick={() => setTarget('manufacturers')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  target === 'manufacturers'
                    ? 'border-[#355C4D] bg-[#355C4D]/10 text-[#355C4D] font-bold shadow-xs'
                    : 'border-[#E5E9E5] bg-white hover:bg-stone-50 text-stone-600'
                }`}
              >
                <Factory size={18} className={target === 'manufacturers' ? 'text-[#355C4D]' : 'text-stone-400'} />
                <span className="font-bold">Fábricas</span>
                <span className="text-[10px] text-stone-400 font-normal">Indústrias Representadas</span>
              </button>
            </div>
          </div>

          {/* Business Rule Informational Notice for Contacts */}
          {target === 'contacts' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-950">
              <div className="font-bold flex items-center gap-1.5 text-xs text-emerald-900">
                <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
                <span>Regra de Prospecção ILEX:</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Todos os clientes importados por planilha entram exclusivamente na aba <strong>Contatos &amp; Prospecção</strong>. Eles <strong>NÃO</strong> aparecerão em Clientes Ativos até que você os ative manualmente na prospecção ou até que um pedido seja emitido para eles.
              </p>
            </div>
          )}

          {/* Subtype Option when target is 'contacts' */}
          {target === 'contacts' && (
            <div className="p-3.5 bg-[#FAF7F0] border border-[#B69A67]/30 rounded-xl space-y-2">
              <div className="font-semibold text-stone-800">
                Classificação Padrão dos Contatos da Planilha:
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700">
                  <input
                    type="radio"
                    name="contactSubtype"
                    checked={contactSubtype === 'person'}
                    onChange={() => setContactSubtype('person')}
                    className="accent-[#355C4D]"
                  />
                  <span>Pessoas / Compradores (PF / Compradores)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-700">
                  <input
                    type="radio"
                    name="contactSubtype"
                    checked={contactSubtype === 'factory'}
                    onChange={() => setContactSubtype('factory')}
                    className="accent-[#355C4D]"
                  />
                  <span>Fábricas / Indústrias (Parcerias ou Representadas)</span>
                </label>
              </div>
              <p className="text-[11px] text-stone-500">
                * Caso a planilha possua uma coluna "Tipo", a ILEX identificará automaticamente por linha.
              </p>
            </div>
          )}

          {/* Input Method Selector */}
          <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
            <button
              type="button"
              onClick={() => setInputMode('file')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${
                inputMode === 'file'
                  ? 'bg-[#355C4D] text-white font-bold'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
            >
              Upload de Arquivo (.xlsx / .csv)
            </button>
            <button
              type="button"
              onClick={() => setInputMode('paste')}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors ${
                inputMode === 'paste'
                  ? 'bg-[#355C4D] text-white font-bold'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
              }`}
            >
              Colar Texto / Tabela CSV Direto
            </button>
          </div>

          {/* Download Template button */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
            <span className="text-stone-600 font-medium">
              Precisa de um modelo predefinido para preencher?
            </span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 text-[#355C4D] border border-stone-300 rounded-lg font-semibold transition-colors shadow-2xs"
            >
              <Download size={14} />
              <span>Baixar Modelo (.xlsx)</span>
            </button>
          </div>

          {/* File Upload or Paste Area */}
          {inputMode === 'file' ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#B69A67]/50 hover:border-[#355C4D] bg-[#F7F8F6] rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <div className="p-3 bg-white rounded-full shadow-2xs border border-stone-200 text-[#355C4D]">
                <UploadCloud size={24} />
              </div>
              <div>
                <span className="font-semibold text-[#355C4D]">Clique para enviar</span> ou arraste a planilha aqui
              </div>
              <p className="text-[11px] text-stone-400">
                Formatos suportados: Excel (.xlsx, .xls) ou Texto delimitado por ponto e vírgula (.csv)
              </p>
              {file && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#355C4D] text-white font-medium text-xs">
                  <FileSpreadsheet size={13} className="text-[#B69A67]" />
                  <span>{file.name}</span>
                  <span className="text-stone-300">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block font-medium text-stone-700">
                Cole o conteúdo CSV ou a lista com cabeçalhos abaixo (separado por ponto e vírgula ou vírgula):
              </label>
              <textarea
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="ID;ID_ERP;CODIGO;NOME;RAZAO SOCIAL;CNPJ/CPF;STATUS;CATEGORIA;TELEFONE 1;EMAIL;CIDADE;ESTADO..."
                className="w-full font-mono text-[11px] p-3 border border-stone-300 rounded-xl focus:outline-hidden focus:border-[#355C4D] bg-white text-stone-800"
              />
              <button
                type="button"
                onClick={handleParsePastedText}
                className="w-full py-2 bg-[#355C4D] hover:bg-[#2A4A3E] text-white rounded-xl font-bold transition-colors text-xs flex items-center justify-center gap-2"
              >
                <span>Identificar e Processar Linhas Coladas</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {resultMessage && (
            <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <span>{resultMessage}</span>
            </div>
          )}

          {/* Parsed Rows Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between font-semibold text-stone-700">
                <span>Prévia dos Dados Identificados ({parsedRows.length} linhas encontradas):</span>
                <span className="text-[11px] text-stone-500">Mostrando primeiras 5 linhas</span>
              </div>

              <div className="border border-[#E5E9E5] rounded-xl overflow-x-auto max-h-48 shadow-2xs">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#233D33] text-white sticky top-0 font-medium">
                    <tr>
                      {previewColumns.slice(0, 6).map((c, idx) => (
                        <th key={idx} className="p-2 border-b border-stone-700 whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {parsedRows.slice(0, 5).map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-stone-50">
                        {previewColumns.slice(0, 6).map((c, cIdx) => (
                          <td key={cIdx} className="p-2 truncate max-w-[140px] text-stone-700">
                            {String(row[c] || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E9E5] bg-[#F7F8F6] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold rounded-xl transition-colors text-xs"
          >
            Fechar
          </button>

          <button
            type="button"
            disabled={parsedRows.length === 0 || isProcessing}
            onClick={handleImport}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-colors ${
              parsedRows.length > 0 && !isProcessing
                ? 'bg-[#355C4D] hover:bg-[#233D33]'
                : 'bg-stone-300 cursor-not-allowed text-stone-500'
            }`}
          >
            {isProcessing ? (
              <span>Processando e cadastrando...</span>
            ) : (
              <>
                <span>Cadastrar {parsedRows.length > 0 ? `${parsedRows.length} Linhas` : 'Dados'}</span>
                <ArrowRight size={14} className="text-[#B69A67]" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
