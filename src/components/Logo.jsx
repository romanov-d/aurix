import { Link } from 'react-router-dom';

export default function Logo() {
  return (
    <Link to="/" className="logo">
      <img src="/logo.svg" alt="AURIX" className="logo-img" />
    </Link>
  );
}
