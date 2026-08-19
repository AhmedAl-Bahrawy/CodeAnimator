import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';

const languageGroups = [
  {
    label: 'Languages',
    items: [
      { value: 'javascript', label: 'JavaScript' },
      { value: 'typescript', label: 'TypeScript' },
      { value: 'jsx', label: 'JSX' },
      { value: 'tsx', label: 'TSX' },
      { value: 'python', label: 'Python' },
      { value: 'html', label: 'HTML' },
      { value: 'css', label: 'CSS' },
      { value: 'sql', label: 'SQL' },
      { value: 'json', label: 'JSON' },
      { value: 'yaml', label: 'YAML' },
      { value: 'c', label: 'C' },
      { value: 'cpp', label: 'C++' },
      { value: 'go', label: 'Go' },
      { value: 'rust', label: 'Rust' },
      { value: 'php', label: 'PHP' },
      { value: 'java', label: 'Java' },
      { value: 'kotlin', label: 'Kotlin' },
      { value: 'csharp', label: 'C#' },
      { value: 'ruby', label: 'Ruby' },
      { value: 'markdown', label: 'Markdown' },
      { value: 'dockerfile', label: 'Dockerfile' },
    ],
  },
  {
    label: 'Terminal / Shell',
    items: [
      { value: 'bash', label: 'Bash / Shell' },
      { value: 'powershell', label: 'PowerShell' },
      { value: 'cmd', label: 'Command Prompt' },
      { value: 'zsh', label: 'Zsh' },
    ],
  },
  {
    label: 'Pseudocode',
    items: [
      { value: 'pseudo', label: 'Pseudocode' },
      { value: 'plaintext', label: 'Plain Text' },
    ],
  },
];

interface LanguagePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px] h-8 text-xs">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        {languageGroups.map((group) => (
          <div key={group.label}>
            <div className="px-2 py-1 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
              {group.label}
            </div>
            {group.items.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
