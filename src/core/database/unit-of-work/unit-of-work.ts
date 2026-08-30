import { UnitOfWorkRepositories } from './unit-of-work-repositories.type';

export abstract class UnitOfWork {
  abstract execute<T>(
    work: (repositories: UnitOfWorkRepositories) => Promise<T>,
  ): Promise<T>;
}
