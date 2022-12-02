import { ActionFunction, HeadersFunction, LinksFunction, LoaderFunction, MetaFunction } from '@remix-run/node';
import { useCatch } from '@remix-run/react';

export const loader: LoaderFunction = async (context) => {

}

export const action: ActionFunction = async (context) => {

}

export const headers: HeadersFunction = (context) => {
  return {

  }
}

export const meta: MetaFunction = (context) => {
  return {

  }
}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div>
      <h1>Error</h1>
      <p>{error.message}</p>
      <p>The stack trace is:</p>
      <pre>{error.stack}</pre>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  return (
    <div>
      <h1>Caught</h1>
      <p>Status: {caught.status}</p>
      <pre>
        <code>{JSON.stringify(caught.data, null, 2)}</code>
      </pre>
    </div>
  );
}

export const handle = {

};

export default () => {

}
