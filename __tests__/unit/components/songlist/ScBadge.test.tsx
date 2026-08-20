import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScBadge from '../../../../src/components/react/songlist/ScBadge';

describe('ScBadge', () => {
  it('渲染金额与宝石图标', () => {
    render(<ScBadge amount="100 SC" />);
    expect(screen.getByText('100 SC')).toBeInTheDocument();
    expect(document.querySelector('.sc-badge__gem')).toBeInTheDocument();
  });

  it('带 title 提示', () => {
    render(<ScBadge amount="100 SC" />);
    expect(screen.getByTitle('礼物曲 100 SC')).toBeInTheDocument();
  });
});
