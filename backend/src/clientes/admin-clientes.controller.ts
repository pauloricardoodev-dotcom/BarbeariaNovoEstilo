import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ClientesAdminService,
  type ClienteAdmin,
  type PaginaClientes,
} from './clientes-admin.service.js';
import {
  AtualizarClienteAdminDto,
  ListarClientesDto,
} from './dto/admin-clientes.dto.js';

/** Clientes no painel. Sem @Publico/@RotaCliente: exige sessão de admin (guard global). */
@Controller('admin/clientes')
export class AdminClientesController {
  constructor(private readonly clientes: ClientesAdminService) {}

  @Get()
  listar(@Query() filtros: ListarClientesDto): Promise<PaginaClientes> {
    return this.clientes.listar(filtros);
  }

  @Get(':id')
  buscar(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ClienteAdmin> {
    return this.clientes.buscarPorId(id);
  }

  @Patch(':id')
  atualizar(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AtualizarClienteAdminDto,
  ): Promise<ClienteAdmin> {
    return this.clientes.atualizar(id, dto);
  }
}
