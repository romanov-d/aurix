import { Link } from 'react-router-dom';

export default function Logo() {
  return (
    <Link to="/" className="logo" aria-label="AURIX MOTORS">
      <span className="logo-shine">
        <img src="/logo3.png" alt="AURIX MOTORS" className="logo-img" />
      </span>
    </Link>
  );
}
