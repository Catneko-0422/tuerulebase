import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { CodingNode } from '@/types/rules';
import { rulesService } from '@/services/rules';

interface OptionsModalProps {
  ruleId: number;
  parentId: number;
  parentLength: number;
  onClose: () => void;
}

export default function OptionsModal({ ruleId, parentId, parentLength, onClose }: OptionsModalProps) {
  const [options, setOptions] = useState<CodingNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newOption, setNewOption] = useState({ name: '', code: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 10;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fetchOptions = async () => {
    setIsLoading(true);
    try {
      const res = await rulesService.getNodes(ruleId, parentId);
      const filteredOptions = res.data.filter(n => n.node_type === 'OPTION');
      // Sort options by code
      filteredOptions.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
      setOptions(filteredOptions);
    } catch (error) {
      console.error("Failed to load options", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, [ruleId, parentId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
      opt.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (opt.code && opt.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [options, searchTerm]);

  const totalPages = Math.ceil(filteredOptions.length / itemsPerPage);
  const currentOptions = filteredOptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rulesService.createNode({
        rule_id: ruleId,
        parent_id: parentId,
        name: newOption.name,
        code: newOption.code,
        segment_length: parentLength,
        node_type: 'OPTION'
      });
      setNewOption({ name: '', code: '' });
      fetchOptions();
    } catch (error) {
      alert('Failed to add option');
    }
  };

  const handleDeleteOption = async (id: number) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteId || !deletePassword) return;
    try {
      await rulesService.deleteNode(deleteId, deletePassword);
      fetchOptions();
      setShowDeleteConfirm(false);
      setDeletePassword('');
      setDeleteId(null);
    } catch (error) {
      alert('Failed to delete option');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      let successCount = 0;
      let failCount = 0;

      setIsLoading(true);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 跳過標題行 (如果有的話)
        if (i === 0 && (line.toLowerCase().includes('name') && line.toLowerCase().includes('code'))) {
          continue;
        }

        const parts = line.split(',');
        if (parts.length < 2) {
          failCount++;
          continue;
        }

        const name = parts[0].trim();
        const code = parts[1].trim();

        try {
          await rulesService.createNode({
            rule_id: ruleId,
            parent_id: parentId,
            name: name,
            code: code,
            segment_length: parentLength,
            node_type: 'OPTION'
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to import line: ${line}`, error);
          failCount++;
        }
      }

      setIsLoading(false);
      alert(`Import completed.\nSuccess: ${successCount}\nFailed: ${failCount}`);
      fetchOptions();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Manage Options</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        
        <form onSubmit={handleAddOption} className="flex flex-col gap-2 mb-6">
          <div className='flex gap-2'>
            <input required placeholder="Name (e.g. Chip Resistor)" className="border p-2 rounded flex-1" value={newOption.name} onChange={e => setNewOption({...newOption, name: e.target.value})} />
            <input required placeholder="Code (e.g. 03)" className="border p-2 rounded w-24" value={newOption.code} onChange={e => setNewOption({...newOption, code: e.target.value})} />
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Add</button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv" 
              onChange={handleFileUpload} 
            />
          </div>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap"
            title="CSV Format: Name,Code"
          >
            Import CSV
          </button>
        </form>
        
        <div className="mb-4">
          <input 
            placeholder="Search options..." 
            className="w-full border p-2 rounded" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          {isLoading ? <div className="text-center text-slate-500">Loading...</div> : currentOptions.map(opt => (
            <div key={opt.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
              <div>
                <span className="font-bold text-slate-700">{opt.name}</span>
                <span className="ml-2 font-mono text-sm bg-white px-1 rounded border text-slate-500">{opt.code}</span>
              </div>
              <button onClick={() => handleDeleteOption(opt.id)} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
            </div>
          ))}
          {!isLoading && filteredOptions.length === 0 && <div className="text-center text-slate-400">No options found.</div>}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">Page {currentPage} of {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold mb-4 text-red-600">確認刪除</h3>
            <p className="text-slate-600 mb-4">請輸入您的管理員密碼以確認刪除。</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await confirmDelete();
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">管理員密碼</label>
                <input type="password" required autoFocus className="w-full border p-2 rounded" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                  setDeleteId(null);
                }} className="px-4 py-2 border rounded hover:bg-slate-50">取消</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">確認刪除</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}