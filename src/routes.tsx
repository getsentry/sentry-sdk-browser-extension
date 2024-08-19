import { type RouteDefinition } from '@solidjs/router';

import Home from './pages/home';
import PageNotFound from './pages/404';

export const routes = [
	{
		path: '/',
		component: Home,
	},
	{
		path: '**',
		component: PageNotFound,
	},
] satisfies RouteDefinition[];
