import { Fragment } from 'react';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Container } from '@/components/common/container';
import { ClientsTable } from './clients-table';

export function ClientsPage() {
  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarPageTitle text="Клиенты" />
            <ToolbarDescription>База клиентов AURIX</ToolbarDescription>
          </ToolbarHeading>
        </Toolbar>
      </Container>
      <Container>
        <ClientsTable />
      </Container>
    </Fragment>
  );
}
