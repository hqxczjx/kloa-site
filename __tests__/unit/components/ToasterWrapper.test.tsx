import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Toaster } from 'sonner';
import ToasterWrapper from '../../../src/components/ui/ToasterWrapper';

// mock sonner，只捕获 ToasterWrapper 透传的 props
vi.mock('sonner', () => ({
  Toaster: vi.fn(() => null),
}));

describe('ToasterWrapper', () => {
  it('向 sonner Toaster 透传 duration/position 与 duality-toast 类名（ToasterWrapper.tsx L5-15）', () => {
    render(<ToasterWrapper />);

    const calls = (Toaster as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toMatchObject({
      duration: 3000,
      position: 'bottom-center',
      toastOptions: {
        classNames: {
          toast: 'duality-toast',
          description: 'duality-toast-description',
          icon: 'duality-toast-icon',
        },
      },
    });
  });
});
