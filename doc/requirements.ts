/** This hub allows you to retrieve any previously loaded module: */
interface ModuleHub {
	(file: string): Object;
}

/** All the modules available to this project are stored here: */
var require: ModuleHub;


/** This interface wraps the constructor type for any generic type */
interface Constructor<T> extends Function  {
	new() : T
}

/** unsafe js wrapper */
interface Object { valueOf(): any }