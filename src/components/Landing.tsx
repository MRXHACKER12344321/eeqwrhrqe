import React from 'react';
import { Home, ExternalLink } from 'lucide-react';

export default function Landing() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      textAlign: 'center'
    }}>
      <Home size={64} color="#ff6b35" style={{ marginBottom: '20px' }} />
      <h1 style={{ fontSize: '32px', marginBottom: '10px', color: '#333' }}>
        Bem-vindo ao Cardápio Digital
      </h1>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '30px', maxWidth: '600px' }}>
        Selecione uma loja para visualizar o cardápio
      </p>
      
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#333' }}>
          Como acessar:
        </h2>
        
        <div style={{
          textAlign: 'left',
          backgroundColor: '#f9f9f9',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          color: '#555',
          lineHeight: '1.6',
          fontFamily: 'monospace'
        }}>
          <p>1. Use a URL com o slug da loja:</p>
          <code style={{ 
            display: 'block', 
            backgroundColor: '#eee', 
            padding: '10px',
            borderRadius: '4px',
            marginTop: '10px',
            marginBottom: '10px'
          }}>
            https://sensational-queijadas-6b93d9.netlify.app/#nomeDaLoja
          </code>
          
          <p style={{ marginTop: '15px' }}>2. Ou acesse o painel master:</p>
          <code style={{ 
            display: 'block', 
            backgroundColor: '#eee', 
            padding: '10px',
            borderRadius: '4px',
            marginTop: '10px',
            marginBottom: '10px'
          }}>
            https://sensational-queijadas-6b93d9.netlify.app/#admin-master
          </code>
        </div>

        <div style={{
          backgroundColor: '#fffbea',
          border: '1px solid #ffd700',
          borderRadius: '8px',
          padding: '15px',
          fontSize: '14px',
          color: '#666',
          marginTop: '20px'
        }}>
          <p style={{ margin: '0' }}>
            💡 <strong>Dica:</strong> Compartilhe o link com o slug da sua loja para os clientes acessarem o cardápio.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '40px', fontSize: '12px', color: '#999' }}>
        <p>✅ Aplicação carregada com sucesso</p>
        <p style={{ marginTop: '10px' }}>Versão 1.0</p>
      </div>
    </div>
  );
}
