import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Home = () => {
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat'); // Redirect to chat if already authenticated
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="home-container">
      <h1>Welcome to Cloak</h1>
      <p>A secure and private Web3 chat application.</p>
      <ConnectButton />
    </div>
  );
};

export default Home;
