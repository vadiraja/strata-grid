import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StrataIcon } from './StrataIcon';
import { IconProvider } from './icon-context';

const MockIcon = ({ size, className }: { size?: number; className?: string }) => (
  <svg data-testid="mock-icon" width={size} className={className} />
);

describe('StrataIcon', () => {
  it('renders a default icon (SVG element present in DOM)', () => {
    const { container } = render(<StrataIcon name="chevron-down" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies override from IconProvider context', () => {
    render(
      <IconProvider overrides={{ 'chevron-down': MockIcon }}>
        <StrataIcon name="chevron-down" />
      </IconProvider>,
    );
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('passes size prop to the icon component', () => {
    render(
      <IconProvider overrides={{ 'chevron-down': MockIcon }}>
        <StrataIcon name="chevron-down" size={24} />
      </IconProvider>,
    );
    const svg = screen.getByTestId('mock-icon');
    expect(svg).toHaveAttribute('width', '24');
  });

  it('passes className prop to the icon component', () => {
    render(
      <IconProvider overrides={{ 'chevron-down': MockIcon }}>
        <StrataIcon name="chevron-down" className="custom-class" />
      </IconProvider>,
    );
    const svg = screen.getByTestId('mock-icon');
    expect(svg).toHaveClass('custom-class');
  });

  it('renders with role="img" and aria-label when label is provided', () => {
    const { container } = render(
      <StrataIcon name="chevron-down" label="Expand row" />,
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-label', 'Expand row');
  });

  it('renders with aria-hidden="true" when label is not provided', () => {
    const { container } = render(<StrataIcon name="chevron-down" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
