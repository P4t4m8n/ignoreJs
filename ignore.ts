// A Map to store dependencies, where the key is an object, and the value is a Map of property keys to Sets of effects
const depsMap = new Map<any, Map<string, Set<Effect>>>();

// Variable to keep track of the currently active effect function
let currentEffect: Effect | null = null;

// Stack to manage nested effect functions
const effectsStack: Effect[] = [];

// Type definition for an effect function, which can take any arguments and return any type
type Effect = (...args: any[]) => any;

// Function to create and manage effect functions
function createEffect(fn: Effect): void {
  // Define the effect function that will be called with any arguments
  const effect = function effect(...args: any[]) {
    // Check if the effect is already in the stack to avoid infinite loops
    if (effectsStack.indexOf(effect) === -1) {
      try {
        currentEffect = effect;
        effectsStack.push(effect);
        return fn(...args);
      } finally {
        // Remove the effect from the stack once it is done executing
        effectsStack.pop();
        // Set the current effect to the previous one in the stack, or null if none
        currentEffect = effectsStack[effectsStack.length - 1] || null;
      }
    }
  };
  effect();
}

// Function to render content inside a specific HTML element
function render(element: string, content: string): void {
  const app = document.querySelector(element);
  if (app !== null) {
    app.innerHTML = content;
  }
}

// Function to make an object reactive, meaning it will trigger effects when properties are accessed or modified
function reactive<T extends object>(obj: T): T {
  // Get all the keys of the object
  const keys = Object.keys(obj) as Array<keyof T>;
  // Create a new object to hold the reactive properties
  const reactiveObj = {} as T;

  keys.forEach((key) => {
    let value = obj[key];
    // Define a getter and setter for the property on the reactive object
    Object.defineProperty(reactiveObj, key, {
      get() {
        // Log the action and track the dependency
        track(reactiveObj, key);
        return value;
      },
      set(newValue) {
        // Log the action and trigger any effects if the value has changed
        if (newValue !== value) {
          value = newValue;
          trigger(reactiveObj, key);
        }
      },
    });
  });

  return reactiveObj;
}

// Function to track dependencies, associating the current effect with the target's key
function track(target: any, key: string | symbol | number): void {
  if (currentEffect) {
    // Get the dependencies map for the target object
    let deps = depsMap.get(target);
    if (!deps) {
      // If no dependencies map exists for this target, create one
      deps = new Map<string, Set<Effect>>();
      depsMap.set(target, deps);
    }
    // Get the Set of effects for the specific property key
    let dep = deps.get(key as string);
    if (!dep) {
      // If no Set exists for this key, create one
      dep = new Set<Effect>();
      deps.set(key as string, dep);
    }
    dep.add(currentEffect);
  }
}

// Function to trigger effects when a target's property changes
function trigger(target: any, key: string | symbol | number): void {
  // Get the dependencies map for the target object
  const deps = depsMap.get(target);
  if (!deps) return;
  // Get the Set of effects for the specific property key
  const dep = deps.get(key as string);
  if (dep) {
    // Create a new Set to store the effects that need to be run
    const effectsToRun = new Set<Effect>(dep);
    // Run each effect in the Set
    effectsToRun.forEach((effect) => {
      effect();
    });
  }
}
