import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersQueryRepository } from '../../query-repositorys/users-query.repository';
import { UsersRepository } from '../../sa/users/users-repository';

export class RegistrationConfirmationCommand {
  constructor(public code: string) {}
}

@CommandHandler(RegistrationConfirmationCommand)
export class RegistrationConfirmationService
  implements ICommandHandler<RegistrationConfirmationCommand>
{
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersQueryRepository: UsersQueryRepository,
  ) {}

  async execute(command: RegistrationConfirmationCommand) {
    const user = await this.usersQueryRepository.findUserByConfirmationCode(
      command.code,
    );
    if (!user) return false;
    if (user.confirmationCode !== command.code) return false;
    if (user.confirmationExpirationDate < new Date()) return false;
    return await this.usersRepository.updateConfirmation(user.id);
  }
}
