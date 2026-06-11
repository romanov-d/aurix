import { Link } from 'react-router-dom';

export default function Logo() {
  return (
    <Link to="/" className="logo" aria-label="AURIX MOTORS">
      <img src="/logo3.png" alt="AURIX MOTORS" className="logo-img" />
    </Link>
  );
}
