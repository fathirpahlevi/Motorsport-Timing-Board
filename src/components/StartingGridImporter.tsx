import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Image as ImageIcon,
  Sparkles,
  Check,
  AlertCircle,
  X,
  Copy,
  Trash2,
  CheckCircle2,
  Plus,
  RefreshCw,
  Eye,
  FileText,
  ArrowRight,
  Tv,
  Radio
} from 'lucide-react';
import { RiderResult } from '../types';
import { recalculateGaps } from '../data';

export interface ParsedStartingRider {
  pos: number;
  no: string;
  nam: string;
  cb?: string;
  btTm?: string;
  tTm?: string;
}

export interface ParsedGridResult {
  raceTitle?: string;
  groupName?: string;
  sessionName?: string;
  racers: ParsedStartingRider[];
}

interface StartingGridImporterProps {
  currentRiders: RiderResult[];
  onApplyRiders: (
    newRiders: RiderResult[],
    mode: 'replace' | 'append',
    metadata?: { raceTitle?: string; groupName?: string; sessionName?: string }
  ) => void;
  isManualMode: boolean;
  onToggleManualMode: (enabled: boolean) => void;
  raceTitle: string;
  groupName: string;
  sessionName: string;
}

interface UploadedImageFile {
  id: string;
  name: string;
  size: number;
  previewUrl: string;
  base64Data: string;
  mimeType: string;
}

// Sample CSV template data
const SAMPLE_CSV = `Pos,No,Name,Team,BestTime
1,46,Valentino Rossi,Yamaha Factory Racing,1:38.210
2,99,Jorge Lorenzo,Yamaha Factory Racing,1:38.345
3,93,Marc Marquez,Repsol Honda Team,1:38.420
4,20,Fabio Quartararo,Monster Energy Yamaha,1:38.580
5,63,Francesco Bagnaia,Ducati Lenovo Team,1:38.610
6,88,Miguel Oliveira,Trackhouse Racing,1:38.750
7,33,Brad Binder,Red Bull KTM Factory,1:38.890
8,12,Maverick Vinales,Aprilia Racing,1:38.920
9,89,Jorge Martin,Prima Pramac Racing,1:39.010
10,72,Marco Bezzecchi,Pertamina Enduro VR46,1:39.150
11,43,Jack Miller,Red Bull KTM Factory,1:39.310
12,21,Franco Morbidelli,Prima Pramac Racing,1:39.450`;

export const StartingGridImporter: React.FC<StartingGridImporterProps> = ({
  currentRiders,
  onApplyRiders,
  isManualMode,
  onToggleManualMode,
  raceTitle,
  groupName,
  sessionName,
}) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'images'>('csv');

  // CSV State
  const [csvText, setCsvText] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvError, setCsvError] = useState<string | null>(null);

  // Image Upload State
  const [uploadedImages, setUploadedImages] = useState<UploadedImageFile[]>([]);
  const [promptHint, setPromptHint] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  // Parsed Staging State (Ready for Review & Application)
  const [previewResult, setPreviewResult] = useState<ParsedGridResult | null>(null);
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');
  const [updateTitlesWithPreview, setUpdateTitlesWithPreview] = useState<boolean>(true);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------------------------------
  // CSV PARSER
  // ----------------------------------------------------
  const parseCsvContent = (content: string) => {
    setCsvError(null);
    if (!content.trim()) {
      setCsvError('CSV content is empty.');
      return;
    }

    try {
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'));

      if (lines.length === 0) {
        setCsvError('No valid rows found in CSV.');
        return;
      }

      // Detect delimiter from first row (comma, semicolon, or tab)
      const firstLine = lines[0];
      const delimiter = firstLine.includes('\t')
        ? '\t'
        : firstLine.includes(';')
        ? ';'
        : ',';

      // Helper to split row handling quotes
      const splitRow = (row: string): string[] => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            result.push(cur.trim().replace(/^["']|["']$/g, ''));
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim().replace(/^["']|["']$/g, ''));
        return result;
      };

      const rawRows = lines.map(splitRow);

      // Check if row 0 is a header
      const headerRow = rawRows[0].map((c) => c.toLowerCase());
      const hasHeader =
        headerRow.some((c) => ['pos', 'position', 'grid', 'rank', 'p'].includes(c)) ||
        headerRow.some((c) => ['no', 'number', 'num', 'bike', '#'].includes(c)) ||
        headerRow.some((c) => ['name', 'racer', 'rider', 'driver', 'nam'].includes(c));

      let posCol = -1;
      let noCol = -1;
      let nameCol = -1;
      let teamCol = -1;
      let timeCol = -1;

      let dataRows: string[][] = [];

      if (hasHeader) {
        headerRow.forEach((h, idx) => {
          if (['pos', 'position', 'grid', 'rank', 'p'].includes(h)) posCol = idx;
          else if (['no', 'number', 'num', 'bike', '#', 'dno'].includes(h)) noCol = idx;
          else if (['name', 'racer', 'rider', 'driver', 'nam', 'fnam'].includes(h)) nameCol = idx;
          else if (['team', 'club', 'group', 'cb', 'cbn'].includes(h)) teamCol = idx;
          else if (['best', 'besttime', 'time', 'lap', 'laptime', 'bttm', 'qual'].includes(h)) timeCol = idx;
        });
        dataRows = rawRows.slice(1);
      } else {
        // Fallback default column order if no header: Pos, No, Name, Team, Time
        posCol = 0;
        noCol = 1;
        nameCol = 2;
        teamCol = 3;
        timeCol = 4;
        dataRows = rawRows;
      }

      // If missing name or number, intelligently guess columns
      if (nameCol === -1) {
        // Find column with text/letters
        for (let col = 0; col < (dataRows[0]?.length || 0); col++) {
          if (col !== posCol && col !== noCol && col !== timeCol) {
            const hasLetters = dataRows.some((r) => /[a-zA-Z]/.test(r[col] || ''));
            if (hasLetters) {
              nameCol = col;
              break;
            }
          }
        }
      }

      if (noCol === -1) {
        for (let col = 0; col < (dataRows[0]?.length || 0); col++) {
          if (col !== posCol && col !== nameCol) {
            const isNumeric = dataRows.every((r) => /^\d+$/.test(r[col] || ''));
            if (isNumeric) {
              noCol = col;
              break;
            }
          }
        }
      }

      const parsedRacers: ParsedStartingRider[] = [];

      dataRows.forEach((row, idx) => {
        const rawName = nameCol >= 0 && row[nameCol] ? row[nameCol].trim() : '';
        const rawNo = noCol >= 0 && row[noCol] ? row[noCol].trim() : '';

        // If row is empty, skip
        if (!rawName && !rawNo) return;

        let posNum = idx + 1;
        if (posCol >= 0 && row[posCol]) {
          const parsed = parseInt(row[posCol].replace(/\D/g, ''), 10);
          if (!isNaN(parsed) && parsed > 0) {
            posNum = parsed;
          }
        }

        const teamVal = teamCol >= 0 && row[teamCol] ? row[teamCol].trim() : '-';
        const timeVal = timeCol >= 0 && row[timeCol] ? row[timeCol].trim() : undefined;

        parsedRacers.push({
          pos: posNum,
          no: rawNo || (idx + 1).toString(),
          nam: rawName || `Racer #${rawNo || idx + 1}`,
          cb: teamVal || '-',
          btTm: timeVal || undefined,
        });
      });

      // Sort by position
      parsedRacers.sort((a, b) => a.pos - b.pos);

      // Re-index sequentially to avoid gaps
      const reindexed = parsedRacers.map((r, i) => ({
        ...r,
        pos: i + 1,
      }));

      if (reindexed.length === 0) {
        setCsvError('Could not find any valid racer records in this CSV.');
        return;
      }

      setPreviewResult({
        racers: reindexed,
      });
      setCsvError(null);
    } catch (err: any) {
      setCsvError(`Failed to parse CSV: ${err.message || 'Unknown error'}`);
    }
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCsvContent(text);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleCsv = () => {
    setCsvText(SAMPLE_CSV);
    setCsvFileName('sample-motogp-grid.csv');
    parseCsvContent(SAMPLE_CSV);
  };

  const handleCopySampleCsv = () => {
    navigator.clipboard.writeText(SAMPLE_CSV);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // ----------------------------------------------------
  // MULTI-IMAGE UPLOAD & GEMINI OCR EXTRACTION
  // ----------------------------------------------------
  const handleImageFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setGeminiError(null);
    const newImages: UploadedImageFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const previewUrl = URL.createObjectURL(file);
      const base64Data = await fileToBase64(file);

      newImages.push({
        id: `img-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        size: file.size,
        previewUrl,
        base64Data,
        mimeType: file.type || 'image/png',
      });
    }

    setUploadedImages((prev) => [...prev, ...newImages]);
    // Reset file input so user can pick the same file again if needed
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        resolve(res);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (id: string) => {
    setUploadedImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleClearAllImages = () => {
    uploadedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setUploadedImages([]);
    setGeminiError(null);
  };

  const handleExtractWithGemini = async () => {
    if (uploadedImages.length === 0) {
      setGeminiError('Please upload at least one starting grid screenshot.');
      return;
    }

    setIsExtracting(true);
    setGeminiError(null);

    try {
      const payload = {
        images: uploadedImages.map((img) => ({
          mimeType: img.mimeType,
          data: img.base64Data,
        })),
        promptHint: promptHint.trim() || undefined,
      };

      const res = await fetch('/api/extract-starting-grid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || `Server returned ${res.status}`);
      }

      const data = json.data;
      if (!data || !Array.isArray(data.racers) || data.racers.length === 0) {
        throw new Error('Gemini could not detect any starting grid racers in the provided images.');
      }

      // Clean up positions and sort
      const sortedRacers: ParsedStartingRider[] = data.racers
        .map((r: any, idx: number) => ({
          pos: typeof r.pos === 'number' && r.pos > 0 ? r.pos : idx + 1,
          no: String(r.no || idx + 1).trim(),
          nam: String(r.nam || `Racer #${r.no || idx + 1}`).trim(),
          cb: r.cb ? String(r.cb).trim() : '-',
          btTm: r.btTm ? String(r.btTm).trim() : undefined,
          tTm: r.tTm ? String(r.tTm).trim() : undefined,
        }))
        .sort((a: ParsedStartingRider, b: ParsedStartingRider) => a.pos - b.pos);

      // Re-index
      const finalRacers = sortedRacers.map((r, i) => ({
        ...r,
        pos: i + 1,
      }));

      setPreviewResult({
        raceTitle: data.raceTitle,
        groupName: data.groupName,
        sessionName: data.sessionName,
        racers: finalRacers,
      });
    } catch (err: any) {
      console.error('Gemini starting grid extraction error:', err);
      setGeminiError(err.message || 'Failed to extract starting grid data.');
    } finally {
      setIsExtracting(false);
    }
  };

  // ----------------------------------------------------
  // APPLY STAGED RIDERS TO GRID
  // ----------------------------------------------------
  const handleApplyStagedRacers = () => {
    if (!previewResult || previewResult.racers.length === 0) return;

    // Convert parsed racers to RiderResult format
    const baseIndex = applyMode === 'append' ? currentRiders.length : 0;

    const formattedRiders: RiderResult[] = previewResult.racers.map((r, idx) => {
      const targetPos = baseIndex + idx + 1;
      return {
        sesId: 'manual-grid',
        eId: 'manual-grid-event',
        id: `grid-rider-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 6)}`,
        nam: r.nam,
        fNam: r.nam,
        no: r.no,
        dNo: r.no,
        cb: r.cb || '-',
        cl: previewResult.groupName || groupName || 'MANUAL GRID',
        cln: previewResult.groupName || groupName || 'MANUAL GRID',
        lbpos: targetPos,
        pos: targetPos.toString(),
        pCl: targetPos.toString(),
        btTm: r.btTm || undefined,
        tTm: r.tTm || undefined,
        lsTm: r.btTm || undefined,
        if: false,
        ls: 0,
        gp: targetPos === 1 ? 'POLE' : r.tTm ? `+${r.tTm}` : '-',
        df: targetPos === 1 ? '-' : '-',
        changeDirection: 'steady',
        changeTime: Date.now(),
        lapStatus: 'none',
      };
    });

    const metadata = updateTitlesWithPreview
      ? {
          raceTitle: previewResult.raceTitle,
          groupName: previewResult.groupName,
          sessionName: previewResult.sessionName,
        }
      : undefined;

    // Call parent handler
    onApplyRiders(formattedRiders, applyMode, metadata);

    // If manual mode is off, automatically enable it so displays show the starting grid
    if (!isManualMode) {
      onToggleManualMode(true);
    }

    // Clear preview
    setPreviewResult(null);
  };

  // Edit preview cell inline
  const handleEditPreviewRow = (idx: number, field: keyof ParsedStartingRider, value: any) => {
    if (!previewResult) return;
    const updated = [...previewResult.racers];
    updated[idx] = {
      ...updated[idx],
      [field]: value,
    };
    setPreviewResult({
      ...previewResult,
      racers: updated,
    });
  };

  const handleDeletePreviewRow = (idx: number) => {
    if (!previewResult) return;
    const updated = previewResult.racers.filter((_, i) => i !== idx).map((r, i) => ({
      ...r,
      pos: i + 1,
    }));
    setPreviewResult({
      ...previewResult,
      racers: updated,
    });
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
      {/* HEADER & QUICK MODE SWITCHER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
              STARTING GRID AUTOMATION
            </span>
            <span className="text-xs font-mono text-zinc-400">
              CSV Upload & Multimodal Gemini OCR
            </span>
          </div>
          <h2 className="text-lg font-black uppercase tracking-tight text-white mt-1 flex items-center gap-2 font-mono">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            Import & Generate Starting Grid Data
          </h2>
          <p className="text-xs text-zinc-400 max-w-2xl mt-0.5">
            Quickly load pre-race starting grid lineups by uploading or pasting a CSV, or uploading one or more screenshot images with Gemini AI extraction.
          </p>
        </div>

        {/* PRE-RACE vs LIVE RACE SWITCHER */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => onToggleManualMode(true)}
            className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isManualMode
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
            title="Show pre-set Starting Grid data on all displays before the race begins"
          >
            <Radio className="w-4 h-4" />
            Pre-Race Grid (Manual)
          </button>
          <button
            type="button"
            onClick={() => onToggleManualMode(false)}
            className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              !isManualMode
                ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
            title="Switch to Speedhive live timing feed when the race starts"
          >
            <Tv className="w-4 h-4" />
            Race Started (Live)
          </button>
        </div>
      </div>

      {/* INPUT METHOD TABS */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('csv')}
          className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'csv'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
              : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          1. CSV Import & Paste
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('images')}
          className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'images'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/40'
              : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          2. Screenshot Images (Gemini AI Multimodal)
          {uploadedImages.length > 0 && (
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {uploadedImages.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CSV FILE & PASTE */}
      {activeTab === 'csv' && (
        <div className="space-y-4 bg-zinc-950/60 border border-zinc-850 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                Upload CSV File or Paste Raw Text
              </h3>
              <p className="text-[11px] text-zinc-400">
                Supports columns: <code className="text-zinc-200">Pos, No, Name, Team, BestTime</code> (or any standard order).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSampleCsv}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" /> Load Sample Grid CSV
              </button>
              <button
                type="button"
                onClick={handleCopySampleCsv}
                className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-bold uppercase rounded-lg border border-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedNotification ? 'Copied!' : 'Copy Format'}
              </button>
            </div>
          </div>

          {/* Drag & Drop / File Selector Area */}
          <div
            onClick={() => csvFileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-800 hover:border-blue-500 rounded-xl p-5 text-center cursor-pointer transition-colors bg-zinc-900/40 hover:bg-zinc-900/70"
          >
            <input
              type="file"
              ref={csvFileInputRef}
              onChange={handleCsvFileUpload}
              accept=".csv,.txt"
              className="hidden"
            />
            <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-zinc-300">
              Click to browse and upload <span className="text-blue-400">.csv</span> or <span className="text-blue-400">.txt</span> file
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">
              {csvFileName ? `Loaded file: ${csvFileName}` : 'Or paste your CSV text directly in the box below'}
            </p>
          </div>

          {/* Paste CSV Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-black uppercase text-zinc-400 tracking-wider">
                Or Paste CSV Content
              </label>
              {csvText && (
                <button
                  type="button"
                  onClick={() => {
                    setCsvText('');
                    setCsvFileName('');
                    setCsvError(null);
                  }}
                  className="text-[10px] text-zinc-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear Text
                </button>
              )}
            </div>
            <textarea
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                if (e.target.value.trim()) {
                  parseCsvContent(e.target.value);
                }
              }}
              placeholder={`Pos,No,Name,Team,BestTime\n1,46,Valentino Rossi,Yamaha Factory Racing,1:38.210\n2,99,Jorge Lorenzo,Yamaha Factory Racing,1:38.345...`}
              rows={5}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          {csvError && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center gap-2 text-red-300 text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{csvError}</span>
            </div>
          )}

          {csvText.trim() && !csvError && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => parseCsvContent(csvText)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Parse & Review Starting Grid
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MULTI-IMAGE SCREENSHOTS WITH GEMINI */}
      {activeTab === 'images' && (
        <div className="space-y-4 bg-zinc-950/60 border border-zinc-850 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Multi-Image Starting Grid Screenshot Scanner
              </h3>
              <p className="text-[11px] text-zinc-400">
                Upload 1 or more screenshots of the starting grid document or timing sheets (supports multiple pages / columns).
              </p>
            </div>

            {uploadedImages.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllImages}
                className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove All Images
              </button>
            )}
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => imageFileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-800 hover:border-purple-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-zinc-900/40 hover:bg-zinc-900/70"
          >
            <input
              type="file"
              ref={imageFileInputRef}
              onChange={handleImageFilesSelected}
              accept="image/*"
              multiple
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center mx-auto mb-2 text-purple-300">
              <ImageIcon className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-zinc-200">
              Click to select screenshot images (<span className="text-purple-400">Multi-select enabled</span>)
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">
              Supports PNG, JPG, WEBP. You can select multiple pages at once or add more sequentially.
            </p>
          </div>

          {/* Uploaded Images Gallery */}
          {uploadedImages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Selected Screenshots ({uploadedImages.length})</span>
                <button
                  type="button"
                  onClick={() => imageFileInputRef.current?.click()}
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add More Images
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {uploadedImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-md flex flex-col"
                  >
                    <div className="h-28 w-full bg-zinc-950 flex items-center justify-center overflow-hidden relative">
                      <img
                        src={img.previewUrl}
                        alt={img.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-sm text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                        Page {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(img.id);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-950/90 hover:bg-red-900 text-red-200 rounded-full cursor-pointer transition-colors"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-2 text-[10px] font-mono truncate text-zinc-300 bg-zinc-900">
                      <p className="truncate font-bold">{img.name}</p>
                      <p className="text-zinc-500 text-[9px]">{(img.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Prompt Hint */}
          <div>
            <label className="block text-[11px] font-black uppercase text-zinc-400 tracking-wider mb-1">
              Optional Note / Hint for Gemini AI
            </label>
            <input
              type="text"
              value={promptHint}
              onChange={(e) => setPromptHint(e.target.value)}
              placeholder="e.g. 'Class is YCR 2 Novice, P1 to P12 on Page 1 and P13 to P24 on Page 2'"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          {geminiError && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center gap-2 text-red-300 text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{geminiError}</span>
            </div>
          )}

          {/* Gemini Trigger Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Powered by Gemini 3.8 Flash Multimodal OCR</span>
            </div>

            <button
              type="button"
              disabled={isExtracting || uploadedImages.length === 0}
              onClick={handleExtractWithGemini}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                isExtracting || uploadedImages.length === 0
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-950/50'
              }`}
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing {uploadedImages.length} Image{uploadedImages.length > 1 ? 's' : ''} with Gemini AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Extract Starting Grid with Gemini AI ({uploadedImages.length} Image{uploadedImages.length > 1 ? 's' : ''})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* REVIEW & CONFIRMATION STAGING CARD                   */}
      {/* ---------------------------------------------------- */}
      {previewResult && previewResult.racers.length > 0 && (
        <div className="bg-zinc-950 border border-emerald-500/50 rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-zinc-950 px-2 py-0.5 rounded">
                  PARSED & READY FOR GRID
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  {previewResult.racers.length} Racers Extracted
                </span>
              </div>
              <h3 className="text-base font-black uppercase text-white mt-1 font-mono flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Review Extracted Starting Grid Lineup
              </h3>
              <p className="text-[11px] text-zinc-400">
                You can review or modify any values directly below before applying to the active starting grid.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewResult(null)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>

          {/* Event Metadata Preview if detected */}
          {(previewResult.raceTitle || previewResult.groupName || previewResult.sessionName) && (
            <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 font-mono">
                  Detected Event Titles
                </span>
                <label className="flex items-center gap-1.5 text-xs font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateTitlesWithPreview}
                    onChange={(e) => setUpdateTitlesWithPreview(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-zinc-950 border-zinc-700 text-emerald-600 cursor-pointer"
                  />
                  <span>Update race/session titles to match</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                {previewResult.raceTitle && (
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                    <span className="text-zinc-500 text-[9px] block uppercase">Event</span>
                    <span className="text-white font-bold">{previewResult.raceTitle}</span>
                  </div>
                )}
                {previewResult.groupName && (
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                    <span className="text-zinc-500 text-[9px] block uppercase">Class / Group</span>
                    <span className="text-white font-bold">{previewResult.groupName}</span>
                  </div>
                )}
                {previewResult.sessionName && (
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                    <span className="text-zinc-500 text-[9px] block uppercase">Session</span>
                    <span className="text-white font-bold">{previewResult.sessionName}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parsed Racers Table */}
          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-zinc-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <tr>
                  <th className="py-2 px-3 text-center w-16">Grid Pos</th>
                  <th className="py-2 px-3 text-center w-16">No.</th>
                  <th className="py-2 px-3">Racer Name</th>
                  <th className="py-2 px-3">Team / Club</th>
                  <th className="py-2 px-3 text-right">Best / Qual Time</th>
                  <th className="py-2 px-3 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {previewResult.racers.map((r, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/50">
                    <td className="py-2 px-3 text-center">
                      <span className="inline-block w-7 py-0.5 rounded bg-zinc-800 text-white font-bold text-center">
                        P{r.pos}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="text"
                        value={r.no}
                        onChange={(e) => handleEditPreviewRow(idx, 'no', e.target.value)}
                        className="w-12 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-center font-bold text-amber-400 focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.nam}
                        onChange={(e) => handleEditPreviewRow(idx, 'nam', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 font-bold text-white uppercase focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.cb || ''}
                        onChange={(e) => handleEditPreviewRow(idx, 'cb', e.target.value)}
                        placeholder="Team name"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-zinc-300 uppercase text-[11px] focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="text"
                        value={r.btTm || ''}
                        onChange={(e) => handleEditPreviewRow(idx, 'btTm', e.target.value)}
                        placeholder="1:42.123"
                        className="w-24 bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-right font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeletePreviewRow(idx)}
                        className="p-1 hover:text-red-400 text-zinc-600 transition-colors cursor-pointer"
                        title="Delete racer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* APPLICATION CONTROLS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-4 text-xs font-mono text-zinc-300">
              <span className="font-bold uppercase text-zinc-400">Import Mode:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="applyMode"
                  value="replace"
                  checked={applyMode === 'replace'}
                  onChange={() => setApplyMode('replace')}
                  className="text-emerald-500 cursor-pointer"
                />
                <span>Replace Entire Grid ({previewResult.racers.length} Racers)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="applyMode"
                  value="append"
                  checked={applyMode === 'append'}
                  onChange={() => setApplyMode('append')}
                  className="text-emerald-500 cursor-pointer"
                />
                <span>Append to Existing ({currentRiders.length} Racers)</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleApplyStagedRacers}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-zinc-950" />
              Apply to Starting Grid & Sync Displays
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
