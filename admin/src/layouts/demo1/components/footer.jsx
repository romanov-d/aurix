import { generalSettings } from '@/config/general.config';
import { Container } from '@/components/common/container';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <Container>
        <div className="flex justify-center items-center gap-2 py-5 font-normal text-sm">
          <span className="text-muted-foreground">{currentYear} &copy;</span>
          <span className="text-secondary-foreground">AURIX MOTORS — панель управления</span>
        </div>
      </Container>
    </footer>
  );
}
