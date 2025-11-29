type QueryConfig = {
  response?: any;
  selectResponse?: any;
  insertResponse?: any;
  updateResponse?: any;
  onSelect?: (fields: unknown, options?: unknown) => void;
  onInsert?: (payload: unknown) => void;
  onUpdate?: (payload: unknown) => void;
};

type TableConfigs = Record<string, QueryConfig[]>;

const createQueryBuilder = (config: QueryConfig = {}) => {
  let currentResponse = config.response ?? {
    data: null,
    error: null,
  };

  const builder: any = {
    select: (fields?: unknown, options?: unknown) => {
      if (config.onSelect) {
        config.onSelect(fields, options);
      }

      if (config.selectResponse !== undefined) {
        currentResponse = config.selectResponse;
      }

      return builder;
    },
    insert: (payload: unknown) => {
      if (config.onInsert) {
        config.onInsert(payload);
      }

      if (config.insertResponse !== undefined) {
        currentResponse = config.insertResponse;
      } else if (config.response !== undefined) {
        currentResponse = config.response;
      }

      return builder;
    },
    update: (payload: unknown) => {
      if (config.onUpdate) {
        config.onUpdate(payload);
      }

      if (config.updateResponse !== undefined) {
        currentResponse = config.updateResponse;
      } else if (config.response !== undefined) {
        currentResponse = config.response;
      }

      return builder;
    },
    delete: () => {
      // For delete operations, eq() should support chaining
      // Return a special object that allows chaining eq() calls
      let eqCallCount = 0;
      const deleteBuilder: any = {
        eq: () => {
          eqCallCount++;
          // Return the builder itself to allow chaining
          // The promise resolution happens via then() method
          return deleteBuilder;
        },
        then: (
          resolve: (value: unknown) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(currentResponse).then(resolve, reject),
        catch: (reject: (reason: unknown) => unknown) =>
          Promise.resolve(currentResponse).catch(reject),
      };
      return deleteBuilder;
    },
    eq: () => builder,
    neq: () => builder,
    in: () => builder,
    or: () => builder,
    ilike: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => Promise.resolve(currentResponse),
    maybeSingle: () => Promise.resolve(currentResponse),
    then: (
      resolve: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(currentResponse).then(resolve, reject),
    catch: (reject: (reason: unknown) => unknown) =>
      Promise.resolve(currentResponse).catch(reject),
  };

  return builder;
};

export const createSupabaseMock = (tableConfigs: TableConfigs) => {
  const callCounters = new Map<string, number>();

  const from = jest.fn((table: string) => {
    const index = callCounters.get(table) ?? 0;
    const configs = tableConfigs[table] || [];

    if (index >= configs.length) {
      throw new Error(
        `No mock configuration for table "${table}" call #${index + 1}`,
      );
    }

    callCounters.set(table, index + 1);
    return createQueryBuilder(configs[index]);
  });

  const auth = {
    admin: {
      getUserById: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'mock-user',
            email_confirmed_at: new Date().toISOString(),
            confirmed_at: new Date().toISOString(),
          },
        },
        error: null,
      }),
    },
  };

  const rpc = jest.fn().mockResolvedValue({ data: null, error: null });

  const client = {
    from,
    auth,
    rpc,
  } as unknown as import('@supabase/supabase-js').SupabaseClient;

  return {
    client,
    from,
    auth,
    rpc,
  };
};
