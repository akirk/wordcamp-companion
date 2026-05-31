(function (WCC) {
    const SCRIPT_BUILD = WCC.SCRIPT_BUILD;
    const SUBSTANTIAL_OVERLAP_SECONDS = WCC.SUBSTANTIAL_OVERLAP_SECONDS;
    const TRACK_CHANGE_LEAD_SECONDS = WCC.TRACK_CHANGE_LEAD_SECONDS;
    const DEBUG_TIME_SLIDER_RANGE_MINUTES = WCC.DEBUG_TIME_SLIDER_RANGE_MINUTES;
    const DEBUG_TIME_SLIDER_STEP_MINUTES = WCC.DEBUG_TIME_SLIDER_STEP_MINUTES;
    const config = WCC.config;
    const state = WCC.state;
    const nodes = WCC.nodes;

    function createQrSvg(text) {
        const matrix = createQrMatrix(text);
        const quiet = 4;
        const scale = 8;
        const size = matrix.length + quiet * 2;
        const parts = [
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + (size * scale) + '" height="' + (size * scale) + '" role="img" aria-label="QR code">',
            '<rect width="100%" height="100%" fill="#fff"/>',
        ];

        matrix.forEach(function (row, y) {
            row.forEach(function (dark, x) {
                if (dark) {
                    parts.push('<rect x="' + (x + quiet) + '" y="' + (y + quiet) + '" width="1" height="1" fill="#000"/>');
                }
            });
        });

        parts.push('</svg>');
        return parts.join('');
    }

    function createQrMatrix(text) {
        const bytes = Array.from(new TextEncoder().encode(text));
        const version = getQrVersionForBytes(bytes.length);
        const blocks = getQrBlocks(version);
        const dataCodewordCount = blocks.reduce(function (sum, block) {
            return sum + block.count * block.data;
        }, 0);
        const dataCodewords = buildQrDataCodewords(bytes, version, dataCodewordCount);
        const finalCodewords = buildQrFinalCodewords(dataCodewords, blocks);
        const size = 17 + version * 4;
        const modules = Array.from({ length: size }, function () {
            return Array(size).fill(false);
        });
        const reserved = Array.from({ length: size }, function () {
            return Array(size).fill(false);
        });

        drawQrFunctionPatterns(modules, reserved, version);
        drawQrCodewords(modules, reserved, finalCodewords);
        drawQrFormatBits(modules, reserved, 0);

        return modules;
    }

    function getQrVersionForBytes(byteLength) {
        for (let version = 1; version <= QR_M_BLOCKS.length; version++) {
            const blocks = getQrBlocks(version);
            const dataCodewordCount = blocks.reduce(function (sum, block) {
                return sum + block.count * block.data;
            }, 0);
            const lengthBits = version < 10 ? 8 : 16;
            const totalBits = 4 + lengthBits + byteLength * 8;

            if (totalBits <= dataCodewordCount * 8) {
                return version;
            }
        }

        throw new Error('QR payload is too large.');
    }

    function buildQrDataCodewords(bytes, version, dataCodewordCount) {
        const bits = [];
        const lengthBits = version < 10 ? 8 : 16;

        appendQrBits(bits, 0x4, 4);
        appendQrBits(bits, bytes.length, lengthBits);
        bytes.forEach(function (byte) {
            appendQrBits(bits, byte, 8);
        });

        const capacityBits = dataCodewordCount * 8;
        appendQrBits(bits, 0, Math.min(4, capacityBits - bits.length));
        while (bits.length % 8) {
            bits.push(0);
        }

        const codewords = [];
        for (let index = 0; index < bits.length; index += 8) {
            let value = 0;
            for (let bit = 0; bit < 8; bit++) {
                value = (value << 1) | bits[index + bit];
            }
            codewords.push(value);
        }

        for (let padIndex = 0; codewords.length < dataCodewordCount; padIndex++) {
            codewords.push(padIndex % 2 ? 0x11 : 0xec);
        }

        return codewords;
    }

    function buildQrFinalCodewords(dataCodewords, blockGroups) {
        const blocks = [];
        let offset = 0;

        blockGroups.forEach(function (group) {
            const eccLength = group.total - group.data;

            for (let index = 0; index < group.count; index++) {
                const data = dataCodewords.slice(offset, offset + group.data);
                offset += group.data;
                blocks.push({
                    data: data,
                    ecc: computeQrErrorCorrection(data, eccLength),
                });
            }
        });

        const result = [];
        const maxDataLength = Math.max.apply(null, blocks.map(function (block) {
            return block.data.length;
        }));
        const maxEccLength = Math.max.apply(null, blocks.map(function (block) {
            return block.ecc.length;
        }));

        for (let index = 0; index < maxDataLength; index++) {
            blocks.forEach(function (block) {
                if (index < block.data.length) {
                    result.push(block.data[index]);
                }
            });
        }

        for (let index = 0; index < maxEccLength; index++) {
            blocks.forEach(function (block) {
                if (index < block.ecc.length) {
                    result.push(block.ecc[index]);
                }
            });
        }

        return result;
    }

    function appendQrBits(bits, value, length) {
        for (let bit = length - 1; bit >= 0; bit--) {
            bits.push((value >>> bit) & 1);
        }
    }

    function drawQrFunctionPatterns(modules, reserved, version) {
        const size = modules.length;

        drawQrFinder(modules, reserved, 0, 0);
        drawQrFinder(modules, reserved, size - 7, 0);
        drawQrFinder(modules, reserved, 0, size - 7);

        for (let index = 8; index < size - 8; index++) {
            setQrFunctionModule(modules, reserved, index, 6, index % 2 === 0);
            setQrFunctionModule(modules, reserved, 6, index, index % 2 === 0);
        }

        getQrAlignmentPositions(version).forEach(function (y) {
            getQrAlignmentPositions(version).forEach(function (x) {
                if (!reserved[y][x]) {
                    drawQrAlignment(modules, reserved, x, y);
                }
            });
        });

        reserveQrFormatBits(modules, reserved);
        if (version >= 7) {
            drawQrVersionBits(modules, reserved, version);
        }
        setQrFunctionModule(modules, reserved, 8, size - 8, true);
    }

    function drawQrFinder(modules, reserved, left, top) {
        for (let dy = -1; dy <= 7; dy++) {
            for (let dx = -1; dx <= 7; dx++) {
                const x = left + dx;
                const y = top + dy;
                if (x < 0 || y < 0 || y >= modules.length || x >= modules.length) {
                    continue;
                }

                const dark = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 &&
                    (dx === 0 || dx === 6 || dy === 0 || dy === 6 || dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
                setQrFunctionModule(modules, reserved, x, y, dark);
            }
        }
    }

    function drawQrAlignment(modules, reserved, centerX, centerY) {
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                setQrFunctionModule(
                    modules,
                    reserved,
                    centerX + dx,
                    centerY + dy,
                    Math.max(Math.abs(dx), Math.abs(dy)) !== 1
                );
            }
        }
    }

    function reserveQrFormatBits(modules, reserved) {
        const size = modules.length;

        for (let index = 0; index < 15; index++) {
            const primary = getQrFormatPrimaryCoordinate(index);
            const secondary = getQrFormatSecondaryCoordinate(index, size);

            setQrFunctionModule(modules, reserved, primary[0], primary[1], false);
            setQrFunctionModule(modules, reserved, secondary[0], secondary[1], false);
        }
    }

    function drawQrVersionBits(modules, reserved, version) {
        const size = modules.length;
        const bits = getQrVersionBits(version);

        for (let index = 0; index < 18; index++) {
            const dark = ((bits >>> index) & 1) === 1;
            const a = size - 11 + index % 3;
            const b = Math.floor(index / 3);

            setQrFunctionModule(modules, reserved, a, b, dark);
            setQrFunctionModule(modules, reserved, b, a, dark);
        }
    }

    function drawQrFormatBits(modules, reserved, mask) {
        const size = modules.length;
        const bits = getQrFormatBits(mask);

        for (let index = 0; index < 15; index++) {
            const dark = ((bits >>> index) & 1) === 1;
            const primary = getQrFormatPrimaryCoordinate(index);
            const secondary = getQrFormatSecondaryCoordinate(index, size);

            setQrFunctionModule(modules, reserved, primary[0], primary[1], dark);
            setQrFunctionModule(modules, reserved, secondary[0], secondary[1], dark);
        }

        setQrFunctionModule(modules, reserved, 8, size - 8, true);
    }

    function getQrFormatPrimaryCoordinate(index) {
        if (index < 6) {
            return [8, index];
        }
        if (index < 8) {
            return [8, index + 1];
        }
        if (index === 8) {
            return [7, 8];
        }
        return [14 - index, 8];
    }

    function getQrFormatSecondaryCoordinate(index, size) {
        if (index < 8) {
            return [size - 1 - index, 8];
        }
        return [8, size - 15 + index];
    }

    function drawQrCodewords(modules, reserved, codewords) {
        const size = modules.length;
        const bits = [];
        let bitIndex = 0;
        let upward = true;

        codewords.forEach(function (codeword) {
            appendQrBits(bits, codeword, 8);
        });

        for (let right = size - 1; right >= 1; right -= 2) {
            if (right === 6) {
                right--;
            }

            for (let vertical = 0; vertical < size; vertical++) {
                const y = upward ? size - 1 - vertical : vertical;
                for (let column = 0; column < 2; column++) {
                    const x = right - column;
                    if (reserved[y][x]) {
                        continue;
                    }

                    const rawBit = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
                    const maskedBit = rawBit !== ((x + y) % 2 === 0);
                    modules[y][x] = maskedBit;
                    bitIndex++;
                }
            }

            upward = !upward;
        }
    }

    function setQrFunctionModule(modules, reserved, x, y, dark) {
        if (x < 0 || y < 0 || y >= modules.length || x >= modules.length) {
            return;
        }

        modules[y][x] = Boolean(dark);
        reserved[y][x] = true;
    }

    function getQrFormatBits(mask) {
        let data = mask;
        let bits = data << 10;

        for (let bit = getQrBitLength(bits) - getQrBitLength(0x537); bit >= 0; bit--) {
            bits ^= 0x537 << bit;
        }

        return ((data << 10) | bits) ^ 0x5412;
    }

    function getQrVersionBits(version) {
        let bits = version << 12;

        for (let bit = getQrBitLength(bits) - getQrBitLength(0x1f25); bit >= 0; bit--) {
            bits ^= 0x1f25 << bit;
        }

        return (version << 12) | bits;
    }

    function getQrBitLength(value) {
        let length = 0;

        while (value) {
            length++;
            value >>>= 1;
        }

        return length;
    }

    function getQrAlignmentPositions(version) {
        return QR_ALIGNMENT_POSITIONS[version] || [];
    }

    function getQrBlocks(version) {
        return QR_M_BLOCKS[version - 1].map(function (block) {
            return {
                count: block[0],
                total: block[1],
                data: block[2],
            };
        });
    }

    function computeQrErrorCorrection(data, degree) {
        const divisor = getQrGeneratorPolynomial(degree);
        const result = Array(degree).fill(0);

        data.forEach(function (byte) {
            const factor = byte ^ result.shift();
            result.push(0);
            divisor.forEach(function (coefficient, index) {
                result[index] ^= qrGfMultiply(coefficient, factor);
            });
        });

        return result;
    }

    function getQrGeneratorPolynomial(degree) {
        let result = [1];

        for (let index = 0; index < degree; index++) {
            const next = Array(result.length + 1).fill(0);
            result.forEach(function (coefficient, coefficientIndex) {
                next[coefficientIndex] ^= coefficient;
                next[coefficientIndex + 1] ^= qrGfMultiply(coefficient, QR_GF_EXP[index]);
            });
            result = next;
        }

        return result.slice(1);
    }

    function qrGfMultiply(a, b) {
        if (!a || !b) {
            return 0;
        }

        return QR_GF_EXP[QR_GF_LOG[a] + QR_GF_LOG[b]];
    }

    function createQrGfTables() {
        const exp = Array(512).fill(0);
        const log = Array(256).fill(0);
        let value = 1;

        for (let index = 0; index < 255; index++) {
            exp[index] = value;
            log[value] = index;
            value <<= 1;
            if (value & 0x100) {
                value ^= 0x11d;
            }
        }

        for (let index = 255; index < exp.length; index++) {
            exp[index] = exp[index - 255];
        }

        return { exp: exp, log: log };
    }

    const QR_M_BLOCKS = [
        [[1, 26, 16]],
        [[1, 44, 28]],
        [[1, 70, 44]],
        [[2, 50, 32]],
        [[2, 67, 43]],
        [[4, 43, 27]],
        [[4, 49, 31]],
        [[2, 60, 38], [2, 61, 39]],
        [[3, 58, 36], [2, 59, 37]],
        [[4, 69, 43], [1, 70, 44]],
        [[1, 80, 50], [4, 81, 51]],
        [[6, 58, 36], [2, 59, 37]],
        [[8, 59, 37], [1, 60, 38]],
        [[4, 64, 40], [5, 65, 41]],
        [[5, 65, 41], [5, 66, 42]],
        [[7, 73, 45], [3, 74, 46]],
        [[10, 74, 46], [1, 75, 47]],
        [[9, 69, 43], [4, 70, 44]],
        [[3, 70, 44], [11, 71, 45]],
        [[3, 67, 41], [13, 68, 42]],
    ];
    const QR_ALIGNMENT_POSITIONS = {
        1: [],
        2: [6, 18],
        3: [6, 22],
        4: [6, 26],
        5: [6, 30],
        6: [6, 34],
        7: [6, 22, 38],
        8: [6, 24, 42],
        9: [6, 26, 46],
        10: [6, 28, 50],
        11: [6, 30, 54],
        12: [6, 32, 58],
        13: [6, 34, 62],
        14: [6, 26, 46, 66],
        15: [6, 26, 48, 70],
        16: [6, 26, 50, 74],
        17: [6, 30, 54, 78],
        18: [6, 30, 56, 82],
        19: [6, 30, 58, 86],
        20: [6, 34, 62, 90],
    };
    const QR_GF_TABLES = createQrGfTables();
    const QR_GF_EXP = QR_GF_TABLES.exp;
    const QR_GF_LOG = QR_GF_TABLES.log;

    Object.assign(WCC, {
        createQrSvg: createQrSvg,
        createQrMatrix: createQrMatrix,
        getQrVersionForBytes: getQrVersionForBytes,
        buildQrDataCodewords: buildQrDataCodewords,
        buildQrFinalCodewords: buildQrFinalCodewords,
        appendQrBits: appendQrBits,
        drawQrFunctionPatterns: drawQrFunctionPatterns,
        drawQrFinder: drawQrFinder,
        drawQrAlignment: drawQrAlignment,
        reserveQrFormatBits: reserveQrFormatBits,
        drawQrVersionBits: drawQrVersionBits,
        drawQrFormatBits: drawQrFormatBits,
        getQrFormatPrimaryCoordinate: getQrFormatPrimaryCoordinate,
        getQrFormatSecondaryCoordinate: getQrFormatSecondaryCoordinate,
        drawQrCodewords: drawQrCodewords,
        setQrFunctionModule: setQrFunctionModule,
        getQrFormatBits: getQrFormatBits,
        getQrVersionBits: getQrVersionBits,
        getQrBitLength: getQrBitLength,
        getQrAlignmentPositions: getQrAlignmentPositions,
        getQrBlocks: getQrBlocks,
        computeQrErrorCorrection: computeQrErrorCorrection,
        getQrGeneratorPolynomial: getQrGeneratorPolynomial,
        qrGfMultiply: qrGfMultiply,
        createQrGfTables: createQrGfTables
    });
})(window.WordCampCompanion = window.WordCampCompanion || {});
