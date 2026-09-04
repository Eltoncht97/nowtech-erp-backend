import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';

@Controller('organizations/:organizationId/branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateBranchDto,
  ) {
    return this.branchesService.create(organizationId, dto);
  }
}
