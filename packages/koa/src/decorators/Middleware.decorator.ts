import { Metadata, ScanHook, ScanNode, LifecycleOnInitHook } from '@augejs/core';

export type MiddlewareMetadata = {
  scanNode: ScanNode
  propertyKey?: string | symbol,
  hooks: CallableFunction[],
}

export function Middleware(hooks: CallableFunction[] | CallableFunction): ClassDecorator & MethodDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: object | Function, key?: string | symbol) => {
    const isConstructor:boolean = typeof target === 'function';
    const constructor:CallableFunction = isConstructor ? (target as CallableFunction) : target.constructor; 
    Metadata.decorate([
      ScanHook(async (scanNode: ScanNode, next: CallableFunction)=> {
        const metadata: MiddlewareMetadata = {
          scanNode,
          hooks: Array.isArray(hooks) ? hooks : [ hooks ],
        }

        if (!isConstructor && key) {
          metadata.propertyKey = key;
        }

        Middleware.defineMetadata(constructor, metadata);
        await next();
      })
    ], constructor);
  }
}

export function MiddlewareHandler(hook?: CallableFunction): MethodDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Object, key: string | symbol) => {
    Metadata.decorate([
      LifecycleOnInitHook(async (scanNode: ScanNode, next: CallableFunction)=> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const instance: any = scanNode.instance;

        if (instance && typeof instance[key] === 'function') {
          // here we need to add to the parent scan node provider.
          const methodHook: CallableFunction = (instance[key] as CallableFunction).bind(instance) as CallableFunction;
          const metadata: MiddlewareMetadata = {
            scanNode,
            hooks: hook ? [ hook, methodHook] : [ methodHook ],
          }
          Middleware.defineMetadata(target.constructor, metadata);
        }
        await next();
      })
    ], target.constructor);
  }
}

export function MiddlewareFactory(factory: CallableFunction): ClassDecorator & MethodDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: object | Function, key?: string | symbol) => {
    const isConstructor:boolean = typeof target === 'function';
    const constructor:CallableFunction = isConstructor ? (target as CallableFunction) : target.constructor; 
    Metadata.decorate([
      LifecycleOnInitHook(async (scanNode: ScanNode, next: CallableFunction)=> {
        const hooks: CallableFunction[] | CallableFunction = await factory(scanNode);
        const metadata: MiddlewareMetadata = {
          scanNode,
          hooks: Array.isArray(hooks) ? hooks : [ hooks ],
        }

        if (!isConstructor && key) {
          metadata.propertyKey = key;
        }

        Middleware.defineMetadata(constructor, metadata);
        await next();
      })
    ], constructor);
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
Middleware.defineMetadata = (target: object, metadata: MiddlewareMetadata) => {
  Metadata.defineInsertEndArrayMetadata(Middleware, [ metadata ], target);
}

// eslint-disable-next-line @typescript-eslint/ban-types
Middleware.getMetadata = (target: object):MiddlewareMetadata[] => {
  return Metadata.getMetadata(Middleware, target) as MiddlewareMetadata[] || [];
}
