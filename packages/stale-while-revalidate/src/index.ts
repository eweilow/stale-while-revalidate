type SWRItem<Value> = {
  value: Value;
  date: Date;
  maxAgeSeconds: number;
};

type Return<Value> = {
  stale: boolean;
  value: Value;
};

export function staleWhileRevalidate<Id, Value>(
  fetcher: (id: Id) => Promise<{ value: Value; maxAgeSeconds?: number }>,
  generateKey: (id: Id) => string = id => id.toString()
) {
  const valueCache = new Map<
    string,
    (fresh?: boolean) => Promise<Return<Value>>
  >();

  return (id: Id, fresh = false) => {
    const key = generateKey(id);
    if (!valueCache.has(key)) {
      valueCache.set(
        key,
        singleStaleWhileRevalidate(() => fetcher(id))
      );
    }

    return valueCache.get(key)(fresh);
  };
}

export function singleStaleWhileRevalidate<Value>(
  fetcher: () => Promise<{ value: Value; maxAgeSeconds?: number }>
) {
  let valueCache: SWRItem<Value> | null;
  let promiseCache: Promise<Return<Value>> | null;

  function executeFetch() {
    valueCache = null;
    promiseCache = fetcher().then(({ value, maxAgeSeconds }) => {
      promiseCache = null;
      valueCache = {
        date: new Date(),
        value,
        maxAgeSeconds: maxAgeSeconds ?? 1
      } as SWRItem<Value>;

      return { value, stale: false };
    });
  }

  async function getItem(fresh = false): Promise<Return<Value>> {
    if (fresh) {
      return {
        stale: false,
        value: (await fetcher()).value
      };
    }

    const cached = valueCache ?? null;
    if (cached != null) {
      const age = (Date.now() - +cached.date) / 1000;
      let stale = false;
      if (age > cached.maxAgeSeconds) {
        executeFetch();
        stale = true;
      }

      return {
        stale,
        value: cached.value
      };
    }

    const cachedPromise = promiseCache ?? null;
    if (cachedPromise != null) {
      return await cachedPromise;
    }

    executeFetch();
    return getItem(fresh);
  }

  return getItem;
}
