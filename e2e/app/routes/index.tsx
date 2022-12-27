import { $params, $path } from 'remix-routes';

$path('/posts/:id', { id: 1 }, { view: 'list', sort: 'price' });

$path('/', { foo: 'bar' });
