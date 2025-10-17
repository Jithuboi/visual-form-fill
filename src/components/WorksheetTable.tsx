import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface TableRow {
  label: string;
  value: string;
  category: string;
  indentLevel?: number;
}

interface WorksheetTableProps {
  data: TableRow[];
  onDataChange: (data: TableRow[]) => void;
}

export const WorksheetTable = ({ data, onDataChange }: WorksheetTableProps) => {
  const [autoCalculate, setAutoCalculate] = useState(false);

  const updateValue = (index: number, newValue: string) => {
    const newData = [...data];
    newData[index] = { ...newData[index], value: newValue };
    onDataChange(newData);
  };

  // Group data by category dynamically
  const categories = Array.from(new Set(data.map(row => row.category)));
  const groupedData = categories.map(category => ({
    name: category,
    rows: data.filter(row => row.category === category)
  }));

  const calculateTotal = (rows: TableRow[]) => {
    if (!autoCalculate) return '';
    return rows
      .filter(row => !row.label.toLowerCase().includes('total'))
      .reduce((sum, row) => sum + (parseFloat(row.value) || 0), 0)
      .toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Extracted Worksheet</h2>
        <div className="flex items-center space-x-2">
          <Switch
            id="auto-calculate"
            checked={autoCalculate}
            onCheckedChange={setAutoCalculate}
          />
          <Label htmlFor="auto-calculate" className="cursor-pointer">
            Auto-calculate totals
          </Label>
        </div>
      </div>

      <div className="grid gap-6">
        {groupedData.map((group, groupIdx) => (
          <Card key={groupIdx} className="p-6 space-y-4">
            <div className="pb-2 border-b-2 border-primary">
              <h3 className="text-xl font-bold">{group.name}</h3>
            </div>
            {group.rows.map((row, idx) => {
              const isTotal = row.label.toLowerCase().includes('total');
              const value = isTotal && autoCalculate 
                ? calculateTotal(group.rows)
                : row.value;
              
              const indentPadding = (row.indentLevel || 0) * 1.5;
              
              return (
                <div key={idx} className="space-y-1">
                  <Label 
                    className="text-sm font-medium" 
                    style={{ paddingLeft: `${indentPadding}rem` }}
                  >
                    {row.label}
                  </Label>
                  <Input
                    type="text"
                    value={value}
                    onChange={(e) => updateValue(data.indexOf(row), e.target.value)}
                    className={isTotal ? 'font-bold border-t-2 border-primary' : ''}
                    disabled={isTotal && autoCalculate}
                  />
                </div>
              );
            })}
          </Card>
        ))}
      </div>
    </div>
  );
};
