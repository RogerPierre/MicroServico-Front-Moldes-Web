import React, { useState, useEffect, useCallback } from 'react';
import { Measurements, RenderApiResponse } from '../types/pattern';

const API_BASE_URL = (import.meta.env.API_URL || import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const API_KEY = import.meta.env.API_KEY || import.meta.env.VITE_API_KEY || 'moldes_sec_token_v1_2026';
const API_URL = `${API_BASE_URL}/v1/render?export_format=all`;
const DEBOUNCE_MS = 600;

export const PatternViewer: React.FC = () => {
  // Estado das medidas corporais (em milímetros)
  const [measurements, setMeasurements] = useState<Measurements>({
    waist: 628.3185307179587,
    hip: 980,
    length: 500,
  });

  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Atualiza os inputs do formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMeasurements((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  // Monta o payload conforme a especificação e envia para a API Python
  const generatePattern = useCallback(async (m: Measurements) => {
    setIsLoading(true);
    setError(null);

    const payload = {
      unit: "mm",
      measurements: {
        waist: m.waist,
        skirt_length: m.length,
      },
      patterns: [
        {
          name: "Saia_Gode_Total",
          paths: [
            {
              type: "line",
              start: { x: "measurements.waist / (2 * pi)", y: 0.0 },
              end: {
                x: "measurements.waist / (2 * pi) + measurements.skirt_length",
                y: 0.0,
              },
            },
            {
              type: "bezier",
              start: {
                x: "measurements.waist / (2 * pi) + measurements.skirt_length",
                y: 0.0,
              },
              control1: {
                x: "measurements.waist / (2 * pi) + measurements.skirt_length",
                y: "0.552285 * (measurements.waist / (2 * pi) + measurements.skirt_length)",
              },
              control2: {
                x: "0.552285 * (measurements.waist / (2 * pi) + measurements.skirt_length)",
                y: "measurements.waist / (2 * pi) + measurements.skirt_length",
              },
              end: { x: 0.0, y: "measurements.waist / (2 * pi) + measurements.skirt_length" },
            },
            {
              type: "line",
              start: { x: 0.0, y: "measurements.waist / (2 * pi) + measurements.skirt_length" },
              end: { x: 0.0, y: "measurements.waist / (2 * pi)" },
            },
            {
              type: "bezier",
              start: { x: 0.0, y: "measurements.waist / (2 * pi)" },
              control1: {
                x: "0.552285 * (measurements.waist / (2 * pi))",
                y: "measurements.waist / (2 * pi)",
              },
              control2: {
                x: "measurements.waist / (2 * pi)",
                y: "0.552285 * (measurements.waist / (2 * pi))",
              },
              end: { x: "measurements.waist / (2 * pi)", y: 0.0 },
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
          'accept': '*/*',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erro no servidor: ${response.statusText}`);
      }

      const result: RenderApiResponse = await response.json();
      setSvgContent(result.data.svg_content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Dispara a geração automaticamente ao mudar qualquer medida (com debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      generatePattern(measurements);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer); // Cancela o timer se o usuário ainda estiver digitando
  }, [measurements, generatePattern]);

  // Handler do formulário — mantém o botão funcional para re-gerar manualmente
  const handleGeneratePattern = (e: React.FormEvent) => {
    e.preventDefault();
    generatePattern(measurements);
  };

  // Função para baixar o arquivo SVG gerado
  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'molde-saia-sob-medida.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.container}>
      <h2>Gerador Paramétrico de Moldes</h2>

      {/* Painel de Formulário e Controles */}
      <form onSubmit={handleGeneratePattern} style={styles.form}>
        <div style={styles.inputGroup}>
          <label>Cintura (mm):</label>
          <input
            type="number"
            name="waist"
            value={measurements.waist}
            onChange={handleInputChange}
            required
          />
        </div>

        <div style={styles.inputGroup}>
          <label>Quadril (mm):</label>
          <input
            type="number"
            name="hip"
            value={measurements.hip}
            onChange={handleInputChange}
            required
          />
        </div>

        <div style={styles.inputGroup}>
          <label>Comprimento (mm):</label>
          <input
            type="number"
            name="length"
            value={measurements.length}
            onChange={handleInputChange}
            required
          />
        </div>

        <button type="submit" disabled={isLoading} style={styles.button}>
          {isLoading ? 'Calculando Geometria...' : 'Gerar Molde'}
        </button>
      </form>

      {/* Exibição de Erros */}
      {error && <div style={styles.errorBox}>{error}</div>}

      {/* Renderização do SVG do Molde */}
      {svgContent && (
        <div style={styles.previewContainer}>
          <div style={styles.previewHeader}>
            <h3>Pré-visualização do Molde (Escala 1:1)</h3>
            <button onClick={handleDownloadSvg} style={styles.downloadBtn}>
              Baixar .SVG
            </button>
          </div>

          <div
            style={styles.svgWrapper}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      )}
    </div>
  );
};

// Estilos inline para facilidade de demonstração
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
    fontFamily: 'sans-serif',
  },
  form: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#1A365D',
    color: '#FFF',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  errorBox: {
    padding: '10px',
    backgroundColor: '#FED7D7',
    color: '#9B2C2C',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  previewContainer: {
    border: '1px solid #CBD5E0',
    borderRadius: '8px',
    padding: '15px',
    backgroundColor: '#F7FAFC',
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  downloadBtn: {
    padding: '6px 12px',
    backgroundColor: '#2B6CB0',
    color: '#FFF',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  svgWrapper: {
    width: '100%',
    overflow: 'auto',
    backgroundColor: '#FFF',
    border: '1px dashed #A0AEC0',
    padding: '20px',
  },
};
