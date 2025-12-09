/**
 * Base interface for all Use Cases
 * @template TRequest - The input type for the use case
 * @template TResponse - The output type for the use case
 */
export interface IUseCase<TRequest, TResponse> {
    execute(request: TRequest): TResponse | Promise<TResponse>;
}
