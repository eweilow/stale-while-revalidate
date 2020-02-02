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
  fetcher: (id: Id) => Promise<{ value: Value; maxAgeSeconds?: number }>
) {
  const valueCache = new Map<Id, (fresh?: boolean) => Promise<Return<Value>>>();

  return (id: Id, fresh = false) => {
    if (!valueCache.has(id)) {
      valueCache.set(
        id,
        singleStaleWhileRevalidate(() => fetcher(id))
      );
    }

    return valueCache.get(id)(fresh);
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
