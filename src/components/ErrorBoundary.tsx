import { Component, type ReactNode, type ReactElement } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  resetError = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#fff7f7',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          color: '#1f2937'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: '#ffffff',
            border: '1px solid #f4c2c2',
            borderRadius: '16px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)',
            padding: '32px 24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ margin: '0 0 12px', fontSize: '28px' }}>Ops, algo quebrou ao carregar a tela.</h2>
            <p style={{ margin: '0 0 20px', lineHeight: 1.6, color: '#4b5563' }}>
              A aplicação não conseguiu renderizar por um erro inesperado. Tente recarregar a página.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: 'none',
                borderRadius: '10px',
                background: '#ef4444',
                color: '#fff',
                padding: '12px 18px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children as ReactElement;
  }
}
