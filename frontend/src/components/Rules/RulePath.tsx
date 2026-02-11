interface RulePathProps {
  path: { level: number; name: string; value: string }[];
  totalLength: number;
}

export default function RulePath({ path, totalLength }: RulePathProps) {
  const currentLength = path.reduce((sum, segment) => sum + segment.value.length, 0);
  const fullCode = path.map(p => p.value).join('-');

  return (
    <div className="p-4 bg-slate-800 text-white rounded-lg shadow-inner mb-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-slate-300">Generated Code</h3>
        <span className={`font-mono text-lg ${currentLength > totalLength ? 'text-red-400' : 'text-green-400'}`}>
          {currentLength} / {totalLength}
        </span>
      </div>
      <div className="font-mono text-xl break-all p-3 bg-black/30 rounded">
        {fullCode || <span className="text-slate-500">No segments selected</span>}
      </div>
    </div>
  );
}