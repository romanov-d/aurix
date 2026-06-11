import { Link } from 'react-router-dom';

export default function Logo() {
  return (
    <Link to="/" className="logo" aria-label="AURIX MOTORS">
      <img src="/letter.svg" alt="" className="logo-mark-img" />
      <span className="logo-wm">
        <span className="logo-wm-1">AURIX</span>
        <span className="logo-wm-2">MOTORS</span>
      </span>
    </Link>
  );
}
