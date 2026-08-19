import type { BackgroundPreset } from '@/types/domain';

export const backgroundPresets: BackgroundPreset[] = [
  {
    id: 'khwarizm-space',
    name: 'Khwarizm Space',
    type: 'gradient',
    value: 'linear-gradient(135deg, #061A3A 0%, #092557 48%, #167BDB 100%)',
    animated: true,
  },
  {
    id: 'mesh-gradient-1',
    name: 'Mesh Gradient (Purple)',
    type: 'gradient',
    value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  },
  {
    id: 'mesh-gradient-2',
    name: 'Mesh Gradient (Teal)',
    type: 'gradient',
    value: 'linear-gradient(135deg, #0d1117 0%, #161b22 30%, #0a192f 100%)',
  },
  {
    id: 'sunset',
    name: 'Sunset Gradient',
    type: 'gradient',
    value: 'linear-gradient(180deg, #1a0a2e 0%, #2d1b69 30%, #e94560 100%)',
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave Grid',
    type: 'gradient',
    value: 'linear-gradient(180deg, #0a0014 0%, #1a0030 50%, #330066 100%)',
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    type: 'gradient',
    value: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 30%, #2d1b69 60%, #0c0c1d 100%)',
  },
  {
    id: 'dark-blur',
    name: 'Dark Blur',
    type: 'gradient',
    value: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)',
  },
  {
    id: 'neon-city',
    name: 'Neon City',
    type: 'gradient',
    value: 'linear-gradient(180deg, #0a0014 0%, #1a0040 40%, #ff0066 100%)',
  },
  {
    id: 'ocean',
    name: 'Ocean Deep',
    type: 'gradient',
    value: 'linear-gradient(180deg, #0a192f 0%, #112240 50%, #233554 100%)',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    type: 'gradient',
    value: 'linear-gradient(135deg, #0a0014 0%, #1a0040 30%, #006666 60%, #0a0014 100%)',
  },
  {
    id: 'solid-dark',
    name: 'Solid Dark',
    type: 'solid',
    value: '#0a0a0f',
  },
  {
    id: 'solid-gray',
    name: 'Solid Gray',
    type: 'solid',
    value: '#1a1a25',
  },
  {
    id: 'solid-black',
    name: 'Solid Black',
    type: 'solid',
    value: '#000000',
  },
];
