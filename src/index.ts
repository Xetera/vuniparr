const CACHE_SECONDS = 1200; /* 20 minutes */

// Export a default object containing event handlers
export default {
	// The fetch handler is invoked when this worker receives a HTTP(S) request
	// and should return a Response (optionally wrapped in a Promise)
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const cacheUrl = new URL(request.url);

		// Construct the cache key from the cache URL
		const cacheKey = new Request(cacheUrl.toString(), request);
		const cache = await caches.open('vuniper');
		const cachedResponse = await cache.match(cacheKey);
		if (cachedResponse) {
			return cachedResponse;
		}
		const data = await fetch('https://api.vuniper.workers.dev/', {
			headers: {
				// required for this to work
				origin: 'https://vuniper.com',
			},
			method: 'POST',
			body: JSON.stringify({ action: 'getValue', keyName: 'movies_front_page', url: 'https://vuniper.com/movies' }),
		}).then((r) => r.json<{ ok: boolean; value: string }>());

		if (!data.ok) {
			return new Response('Error', { status: 500 });
		}

		const result = JSON.parse(data.value);

		const out = result.web.map((item: any) => {
			return {
				title: item.title,
				poster_url: item.img,
				imdb_id: item.imdb_id,
			};
		});

		const response = new Response(JSON.stringify(out), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': `max-age=${CACHE_SECONDS}`,
			},
		});
		ctx.waitUntil(cache.put(cacheKey, response.clone()));

		return response;
	},
};
